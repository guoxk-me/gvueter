import type { Component } from 'vue'
import type {
  MarkAllNotificationsReadResponse,
  MarkNotificationReadResponse,
  MessageCenterResponse,
  NotificationEventListener,
  NotificationRealtimeEvent,
  NotificationTransport,
  NotificationUnreadResponse,
} from '@/features/notifications'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { h, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminHeader from '@/components/layout/AdminHeader.vue'
import {
  createInMemoryNotificationTransport,
  createWebSocketNotificationTransport,
  getNotificationWebSocketAllowedOrigins,
  isTrustedNotificationWebSocketUrl,
} from '@/features/notifications'
import { getMessageCenterQueryKey } from '@/features/notifications/composables/useMessageCenter'
import {
  notificationUnreadQueryKey,
  useNotificationRealtime,
} from '@/features/notifications/composables/useNotificationRealtime'
import { i18n, setLocale } from '@/i18n'
import { get, post, put } from '@/lib/http'
import { generateMockToken, mockUsers } from '@/mocks/data/users'
import MessageCenterPage from '@/pages/admin/MessageCenterPage.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { getTestPrincipal } from './auth-test-helpers'

const realtimeEvent: NotificationRealtimeEvent = {
  eventId: 'event-live-001',
  notification: {
    id: 'notification-live-001',
    category: 'notification',
    titleKey: 'messageCenter.items.releaseTitle',
    bodyKey: 'messageCenter.items.releaseBody',
    createdAt: '2026-07-13T10:00:00.000Z',
    tone: 'info',
    isRead: false,
  },
}

function setUserToken(userId: number): void {
  sessionStorage.setItem('auth_token', generateMockToken(userId))
}

function createDelayedNotificationTransport() {
  let listener: NotificationEventListener | undefined
  const start = vi.fn((nextListener: NotificationEventListener) => {
    listener = nextListener
  })
  const stop = vi.fn()
  const transport: NotificationTransport = { start, stop }

  return {
    transport,
    start,
    stop,
    publish: (event: NotificationRealtimeEvent) => listener?.(event),
  }
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  setLocale('en-US')
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('notification API authorization and read state', () => {
  it('requires authentication and only returns messages addressed to the current user', async () => {
    await expect(get('/notifications')).rejects.toMatchObject({ status: 401 })

    setUserToken(2)
    const editorMessages = await get<MessageCenterResponse>('/notifications', {
      category: 'all',
      read: 'all',
    })

    expect(editorMessages.items.map((item) => item.id)).toContain('task-publish-release-notes')
    expect(editorMessages.items.map((item) => item.id)).not.toContain('notification-access-review')
    expect(editorMessages.items.every((item) => !('recipientUserIds' in item))).toBe(true)

    const unreadTasks = await get<MessageCenterResponse>('/notifications', {
      category: 'task',
      read: 'unread',
    })
    expect(unreadTasks.items.map((item) => item.id)).toEqual(['task-publish-release-notes'])
  })

  it('marks one or one category as read without exposing another user message', async () => {
    setUserToken(2)
    await expect(put('/notifications/notification-access-review/read')).rejects.toMatchObject({
      code: 'NOTIFICATION_NOT_FOUND',
      status: 404,
    })

    const marked = await put<MarkNotificationReadResponse>(
      '/notifications/notification-user-import/read',
    )
    expect(marked.item).toMatchObject({ id: 'notification-user-import', isRead: true })

    const categoryResult = await post<MarkAllNotificationsReadResponse>('/notifications/read-all', {
      category: 'task',
    })
    expect(categoryResult.markedIds).toEqual(['task-publish-release-notes'])
    expect(categoryResult.unreadCount).toBe(1)
  })
})

describe('notification store and transports', () => {
  it('persists only read projections and an authoritative unread count', () => {
    const notificationStore = useNotificationStore()
    notificationStore.syncUnreadCount(4)
    notificationStore.markRead('notification-1')
    notificationStore.markRead('notification-1')
    notificationStore.incrementUnreadCount()
    notificationStore.markAllRead(['notification-2', 'notification-3'])

    expect(notificationStore.readNotificationIds).toEqual([
      'notification-1',
      'notification-2',
      'notification-3',
    ])
    expect(notificationStore.unreadCount).toBe(2)
    expect(notificationStore.$state).not.toHaveProperty('items')
  })

  it('delivers deterministic in-memory events once and stops cleanly', () => {
    const transport = createInMemoryNotificationTransport([realtimeEvent, realtimeEvent])
    const listener = vi.fn()
    transport.start(listener)
    transport.publish({ ...realtimeEvent, eventId: 'event-live-002' })
    transport.stop()
    transport.publish({ ...realtimeEvent, eventId: 'event-live-003' })

    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('authenticates after opening, reconnects with backoff, deduplicates, and cancels on stop', () => {
    vi.useFakeTimers()
    const sockets: WebSocket[] = []
    const socketSenders: Array<ReturnType<typeof vi.fn>> = []
    const socketFactory = vi.fn((_socketUrl: string) => {
      const send = vi.fn()
      const socket = {
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
        send,
        close: vi.fn(),
      } as unknown as WebSocket
      sockets.push(socket)
      socketSenders.push(send)
      return socket
    })
    const listener = vi.fn()
    const transport = createWebSocketNotificationTransport(
      'wss://notifications.example.test/events',
      () => 'private-token',
      {
        socketFactory,
        baseReconnectDelayMs: 100,
        maxReconnectDelayMs: 800,
        allowedOrigins: getNotificationWebSocketAllowedOrigins([
          'wss://notifications.example.test',
        ]),
      },
    )

    transport.start(listener)
    const firstSocket = sockets[0]!
    firstSocket.onopen?.(new Event('open'))
    expect(socketSenders[0]).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'authenticate',
        token: 'private-token',
      }),
    )
    expect(socketFactory.mock.calls[0]?.[0]).not.toContain('private-token')

    const eventMessage = new MessageEvent('message', { data: JSON.stringify(realtimeEvent) })
    firstSocket.onmessage?.(eventMessage)
    firstSocket.onmessage?.(eventMessage)
    expect(listener).toHaveBeenCalledOnce()

    firstSocket.onclose?.(new CloseEvent('close'))
    vi.advanceTimersByTime(99)
    expect(socketFactory).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(1)
    expect(socketFactory).toHaveBeenCalledTimes(2)

    sockets[1]?.onclose?.(new CloseEvent('close'))
    vi.advanceTimersByTime(199)
    expect(socketFactory).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(1)
    expect(socketFactory).toHaveBeenCalledTimes(3)

    transport.stop()
    sockets[2]?.onclose?.(new CloseEvent('close'))
    vi.advanceTimersByTime(1_000)
    expect(socketFactory).toHaveBeenCalledTimes(3)
  })

  it('rejects arbitrary or insecure WebSocket origins before creating a credentialed socket', () => {
    const socketFactory = vi.fn()

    expect(
      isTrustedNotificationWebSocketUrl('wss://attacker.example.test/events', {
        baseUrl: 'https://admin.example.test',
      }),
    ).toBe(false)
    expect(
      isTrustedNotificationWebSocketUrl('ws://notifications.example.test/events', {
        baseUrl: 'https://admin.example.test',
        allowedOrigins: new Set(['ws://notifications.example.test']),
      }),
    ).toBe(false)
    expect(() =>
      createWebSocketNotificationTransport(
        'wss://attacker.example.test/events',
        () => 'private-token',
        { baseUrl: 'https://admin.example.test', socketFactory },
      ),
    ).toThrow('Notification WebSocket URL is not trusted')
    expect(socketFactory).not.toHaveBeenCalled()
  })

  it('projects a realtime event into Query cache and the Pinia unread count', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const queryClient = new QueryClient()
    const authStore = useAuthStore(pinia)
    authStore.setToken(generateMockToken(1))
    authStore.setAuthenticatedPrincipal(getTestPrincipal(mockUsers[0]!))
    queryClient.setQueryData<MessageCenterResponse>(
      getMessageCenterQueryKey({ category: 'all', read: 'all' }),
      { items: [], total: 0, unreadCount: 0 },
    )
    queryClient.setQueryData<NotificationUnreadResponse>(notificationUnreadQueryKey, {
      unreadCount: 0,
    })
    const transport = createInMemoryNotificationTransport()
    const RealtimeHost: Component = {
      setup() {
        useNotificationRealtime(() => transport)
        return () => h('div')
      },
    }
    const wrapper = mount(RealtimeHost, {
      global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
    })

    transport.publish(realtimeEvent)
    transport.publish(realtimeEvent)

    const cachedMessages = queryClient.getQueryData<MessageCenterResponse>(
      getMessageCenterQueryKey({ category: 'all', read: 'all' }),
    )
    expect(cachedMessages?.items).toEqual([realtimeEvent.notification])
    expect(useNotificationStore(pinia).unreadCount).toBe(1)
    wrapper.unmount()
  })

  it('rotates transports between principals and rejects events from stopped sessions', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const queryClient = new QueryClient()
    const authStore = useAuthStore(pinia)
    const firstToken = generateMockToken(1)
    authStore.setToken(firstToken)
    authStore.setAuthenticatedPrincipal(getTestPrincipal(mockUsers[0]!))
    const controlledTransports: Array<ReturnType<typeof createDelayedNotificationTransport>> = []
    const createTransport = vi.fn((sessionToken: string) => {
      const controlledTransport = createDelayedNotificationTransport()
      controlledTransports.push(controlledTransport)
      expect(sessionToken).toBe(authStore.token)
      return controlledTransport.transport
    })
    const RealtimeHost: Component = {
      setup() {
        useNotificationRealtime(createTransport)
        return () => h('div')
      },
    }
    const wrapper = mount(RealtimeHost, {
      global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
    })

    expect(createTransport).toHaveBeenCalledWith(firstToken)
    controlledTransports[0]?.publish(realtimeEvent)
    expect(useNotificationStore(pinia).unreadCount).toBe(1)

    const secondToken = generateMockToken(2)
    authStore.setToken(secondToken)
    controlledTransports[0]?.publish({
      ...realtimeEvent,
      eventId: 'event-during-session-change',
      notification: { ...realtimeEvent.notification, id: 'notification-during-session-change' },
    })
    expect(useNotificationStore(pinia).unreadCount).toBe(1)
    authStore.setAuthenticatedPrincipal(getTestPrincipal(mockUsers[1]!))
    await nextTick()

    expect(controlledTransports[0]?.stop).toHaveBeenCalledOnce()
    expect(createTransport).toHaveBeenLastCalledWith(secondToken)
    controlledTransports[0]?.publish({
      ...realtimeEvent,
      eventId: 'event-stale-session',
      notification: { ...realtimeEvent.notification, id: 'notification-stale-session' },
    })
    controlledTransports[1]?.publish({
      ...realtimeEvent,
      eventId: 'event-current-session',
      notification: { ...realtimeEvent.notification, id: 'notification-current-session' },
    })
    expect(useNotificationStore(pinia).unreadCount).toBe(2)

    await authStore.logout()
    await nextTick()
    expect(controlledTransports[1]?.stop).toHaveBeenCalledOnce()
    controlledTransports[1]?.publish({
      ...realtimeEvent,
      eventId: 'event-after-logout',
      notification: { ...realtimeEvent.notification, id: 'notification-after-logout' },
    })
    expect(useNotificationStore(pinia).unreadCount).toBe(2)
    wrapper.unmount()
  })
})

describe('message center page', () => {
  it('links the global unread bell to the message center route', () => {
    const pinia = createPinia()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/dashboard', component: { template: '<div />' } },
        { path: '/message-center', component: { template: '<div />' } },
      ],
    })
    const wrapper = mount(AdminHeader, {
      props: { isMobileNavigationOpen: false },
      global: {
        plugins: [pinia, i18n, router, [VueQueryPlugin, { queryClient }]],
        stubs: {
          GlobalSearch: true,
          LanguageToggleButton: true,
        },
      },
    })

    expect(wrapper.get('a[title="Notifications"]').attributes('href')).toBe('/message-center')
  })

  it('loads messages and marks an unread row through the public UI', async () => {
    setUserToken(1)
    const pinia = createPinia()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = mount(MessageCenterPage, {
      global: { plugins: [pinia, i18n, [VueQueryPlugin, { queryClient }]] },
    })

    await flushPromises()
    await vi.waitFor(() =>
      expect(wrapper.text()).toContain('Quarterly access review requires attention'),
    )
    const markReadButton = wrapper.get(
      '[aria-label="Mark “Quarterly access review requires attention” as read"]',
    )
    await markReadButton.trigger('click')
    await flushPromises()

    expect(useNotificationStore(pinia).readNotificationIds).toContain('notification-access-review')
  })
})
