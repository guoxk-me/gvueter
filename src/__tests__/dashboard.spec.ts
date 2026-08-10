import type {
  AnnouncementInput,
  AnnouncementRecord,
} from '@/features/content-admin/types/announcements'
import type { DashboardOverview } from '@/features/dashboard/types'
import type { ApiResponse } from '@/lib/http'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { http, HttpResponse } from 'msw'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createMemoryHistory, createRouter } from 'vue-router'
import { i18n, setLocale } from '@/i18n'
import { del, post, put } from '@/lib/http'
import { resetMockDashboardData } from '@/mocks/data/dashboard'
import { generateMockToken, mockUsers, resetMockUsers } from '@/mocks/data/users'
import { resetMockAnnouncements } from '@/mocks/handlers/announcements'
import { createDashboardOverview } from '@/mocks/handlers/dashboard'
import { resetMockNotifications } from '@/mocks/handlers/notifications'
import { resetMockOperationLogs } from '@/mocks/handlers/operation-logs'
import { server } from '@/mocks/node'
import DashboardPage from '@/pages/admin/DashboardPage.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { getTestPrincipal } from './auth-test-helpers'

vi.mock('@unovis/vue', () => ({
  VisAxis: { template: '<span />' },
  VisLine: { template: '<span />' },
  VisStackedBar: { template: '<span />' },
  VisXYContainer: { template: '<div data-testid="chart"><slot /></div>' },
}))

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: { template: '<div><slot /></div>' },
}))

enableAutoUnmount(afterEach)

async function mountDashboardPage() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore(pinia)
  const admin = mockUsers[0]!
  const { password: _password, ...currentUser } = admin
  const token = generateMockToken(admin.id)
  auth.setToken(token)
  auth.setAuthenticatedPrincipal(getTestPrincipal(currentUser))
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/dashboard', component: { template: '<div />' } },
      { path: '/users', component: { template: '<div />' } },
      { path: '/roles', component: { template: '<div />' } },
      { path: '/components', component: { template: '<div />' } },
      { path: '/profile', component: { template: '<div />' } },
    ],
  })
  await router.push('/dashboard')
  await router.isReady()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const wrapper = mount(DashboardPage, {
    global: {
      plugins: [pinia, i18n, router, [VueQueryPlugin, { queryClient }]],
    },
  })

  return { pinia, queryClient, wrapper }
}

describe('dashboard overview calculation', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    setLocale('en-US')
    resetMockUsers()
    resetMockDashboardData()
    resetMockAnnouncements()
    resetMockNotifications()
    resetMockOperationLogs()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('reconciles metrics, trend, distribution, and ranking to mock business records', () => {
    const overview = createDashboardOverview(new Date('2026-07-13T12:00:00.000Z'))

    // AI modified: the documented Viewer credential is an active account, while one separate fixture remains suspended.
    expect(overview.summary).toMatchObject({
      totalUsers: 8,
      activeUsers: 7,
      activeUserRate: 87.5,
      registrationsLast30Days: 1,
      successfulLogins24Hours: 5,
      uniqueLoginUsers24Hours: 4,
      openTasks: 4,
      tasksDueSoon: 2,
    })
    expect(overview.registrationTrend).toHaveLength(12)
    expect(overview.registrationTrend[overview.registrationTrend.length - 1]?.totalUsers).toBe(8)
    expect(overview.roleDistribution.reduce((total, role) => total + role.userCount, 0)).toBe(8)
    // AI modified: equal department counts follow the handler's documented name tie-breaker.
    expect(overview.departmentRanking.slice(0, 2)).toMatchObject([
      { departmentId: 'finance', activeUsers: 2 },
      { departmentId: 'product', activeUsers: 2 },
    ])
    expect(overview.announcements).toEqual([
      expect.objectContaining({
        id: 'announcement-access-review',
        title: 'Quarterly access review',
        tone: 'warning',
      }),
    ])
    expect(overview.announcements[0]?.body).not.toContain('<p>')
    expect(overview.recentOperations[0]).toMatchObject({
      id: 'log-1',
      actorName: '超级管理员',
      summary: 'Published announcement announcement-access-review.',
      outcome: 'success',
    })
  })

  it('reflects announcement publication lifecycle in subsequent dashboard projections', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(1))
    const input: AnnouncementInput = {
      title: 'Maintenance window',
      content: '<p>Services restart at <strong>02:00 UTC.</strong></p>',
      priority: 'important',
    }
    const created = await post<AnnouncementRecord>('/announcements', input)

    expect(createDashboardOverview().announcements.some((entry) => entry.id === created.id)).toBe(
      false,
    )

    await put(`/announcements/${created.id}/status`, { status: 'published' })
    const publishedOverview = createDashboardOverview()
    expect(publishedOverview.announcements).toContainEqual(
      expect.objectContaining({
        id: created.id,
        title: input.title,
        body: 'Services restart at 02:00 UTC.',
        tone: 'warning',
      }),
    )
    expect(publishedOverview.recentOperations).toContainEqual(
      expect.objectContaining({
        summary: `Published announcement ${created.id}.`,
        outcome: 'success',
      }),
    )

    await put(`/announcements/${created.id}/status`, { status: 'offline' })
    expect(createDashboardOverview().announcements.some((entry) => entry.id === created.id)).toBe(
      false,
    )

    await put(`/announcements/${created.id}/status`, { status: 'published' })
    await del(`/announcements/${created.id}`)
    expect(createDashboardOverview().announcements.some((entry) => entry.id === created.id)).toBe(
      false,
    )
  })

  it('isolates dashboard projections from the mutable Mock sources', () => {
    const overview = createDashboardOverview(new Date('2026-07-13T12:00:00.000Z'))
    overview.announcements[0]!.title = 'Changed by a consumer'
    overview.recentOperations[0]!.summary = 'Changed by a consumer'

    const nextOverview = createDashboardOverview(new Date('2026-07-13T12:00:00.000Z'))
    expect(nextOverview.announcements[0]?.title).toBe('Quarterly access review')
    expect(nextOverview.recentOperations[0]?.summary).toBe(
      'Published announcement announcement-access-review.',
    )
  })

  it('tracks only notification read state in the persisted Pinia boundary', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const notifications = useNotificationStore(pinia)
    const overview = createDashboardOverview(new Date('2026-07-13T12:00:00.000Z'))

    notifications.syncNotifications(overview.notifications)
    expect(notifications.unreadCount).toBe(2)

    notifications.markRead('notification-access-review')
    expect(notifications.unreadCount).toBe(1)
    expect(notifications.readNotificationIds).toEqual(['notification-access-review'])

    notifications.markAllRead(overview.notifications.map((notification) => notification.id))
    expect(notifications.unreadCount).toBe(0)
    expect(notifications.readNotificationIds).toHaveLength(3)
  })
})

describe('DashboardPage query states', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    setLocale('en-US')
    resetMockNotifications()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('shows loading then source-backed dashboard content', async () => {
    const { pinia, wrapper } = await mountDashboardPage()
    expect(wrapper.find('[data-testid="dashboard-loading"]').exists()).toBe(true)

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Registered user trend')
    })

    expect(wrapper.text()).toContain('Registered users')
    expect(wrapper.text()).toContain('Active users by department')
    expect(wrapper.findAll('[data-testid="chart"]')).toHaveLength(2)
    expect(useNotificationStore(pinia).unreadCount).toBe(2)
    const notificationsCard = wrapper.get('#notifications')
    // AI modified: notification counts and row boundaries use the installed UI primitives.
    expect(notificationsCard.get('[data-slot="badge"]').text()).toBe('2')
    expect(notificationsCard.findAll('[data-slot="separator"]')).toHaveLength(2)
    expect(
      notificationsCard
        .findAll('button')
        .find((button) => button.text().includes('Mark all read'))
        ?.get('svg')
        .attributes('data-icon'),
    ).toBe('inline-start')
  })

  it('renders a retryable error state', async () => {
    server.use(
      http.get('/api/dashboard/overview', () =>
        HttpResponse.json<ApiResponse<null>>(
          { code: 500, message: 'Temporary dashboard failure', data: null },
          { status: 500 },
        ),
      ),
    )
    const { wrapper } = await mountDashboardPage()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Temporary dashboard failure')
    })
    expect(wrapper.text()).toContain('Unable to load dashboard')
    expect(wrapper.get('button').text()).toContain('Try again')
  })

  it('renders the empty state for an empty account population', async () => {
    const emptyOverview: DashboardOverview = createDashboardOverview(
      new Date('2026-07-13T12:00:00.000Z'),
    )
    emptyOverview.summary = {
      totalUsers: 0,
      activeUsers: 0,
      activeUserRate: 0,
      registrationsLast30Days: 0,
      successfulLogins24Hours: 0,
      uniqueLoginUsers24Hours: 0,
      openTasks: 0,
      tasksDueSoon: 0,
    }
    server.use(
      http.get('/api/dashboard/overview', () =>
        HttpResponse.json<ApiResponse<DashboardOverview>>({
          code: 0,
          message: 'success',
          data: emptyOverview,
        }),
      ),
    )
    const { wrapper } = await mountDashboardPage()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('No dashboard data')
    })
  })

  it('confirms one and all notification read actions with the server before updating projections', async () => {
    const { pinia, queryClient, wrapper } = await mountDashboardPage()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Access review requires attention')
    })
    await wrapper
      .get('[aria-label="Mark “Access review requires attention” as read"]')
      .trigger('click')
    await flushPromises()

    await vi.waitFor(() => {
      expect(useNotificationStore(pinia).readNotificationIds).toContain(
        'notification-access-review',
      )
    })
    const overview = queryClient.getQueryData<DashboardOverview>(['dashboard', 'overview'])
    const accessReview = overview
      ? overview.notifications.find(
          (notification) => notification.id === 'notification-access-review',
        )
      : undefined
    expect(accessReview?.isRead).toBe(true)

    const markAllReadButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Mark all read'))
    expect(markAllReadButton).toBeDefined()
    await markAllReadButton!.trigger('click')
    await flushPromises()

    await vi.waitFor(() => {
      const overview = queryClient.getQueryData<DashboardOverview>(['dashboard', 'overview'])
      expect(overview?.notifications.every((notification) => notification.isRead)).toBe(true)
    })
  })

  it('keeps Dashboard query and Pinia read state unchanged when the read request fails', async () => {
    server.use(
      http.put('/api/notifications/notification-access-review/read', () =>
        HttpResponse.json<ApiResponse<null>>(
          { code: 'READ_FAILED', message: 'Unable to persist read state', data: null },
          { status: 500 },
        ),
      ),
    )
    const { pinia, queryClient, wrapper } = await mountDashboardPage()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Access review requires attention')
    })
    await wrapper
      .get('[aria-label="Mark “Access review requires attention” as read"]')
      .trigger('click')
    await flushPromises()

    const notificationStore = useNotificationStore(pinia)
    expect(notificationStore.readNotificationIds).not.toContain('notification-access-review')
    const overview = queryClient.getQueryData<DashboardOverview>(['dashboard', 'overview'])
    const accessReview = overview
      ? overview.notifications.find(
          (notification) => notification.id === 'notification-access-review',
        )
      : undefined
    expect(accessReview?.isRead).toBe(false)
  })
})
