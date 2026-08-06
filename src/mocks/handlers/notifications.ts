import type {
  MarkAllNotificationsReadInput,
  MarkAllNotificationsReadResponse,
  MarkNotificationReadResponse,
  MessageCenterItem,
  MessageCenterResponse,
  NotificationCategoryFilter,
  NotificationReadFilter,
  NotificationUnreadResponse,
} from '@/features/notifications/types'
import type { ApiResponse } from '@/lib/http'
import { http, HttpResponse } from 'msw'
import { MARK_ALL_NOTIFICATIONS_READ_INPUT_SCHEMA } from '@/features/notifications/notification-api-contracts'
import { NOTIFICATION_CATEGORIES, NOTIFICATION_READ_FILTERS } from '@/features/notifications/types'
import { readMockJsonBody } from '@/mocks/request-validation'
import { authenticateMockRequest } from './auth'

interface MockNotificationRecord extends Omit<MessageCenterItem, 'isRead'> {
  recipientUserIds: 'all' | number[]
  readByUserIds: number[]
}

const initialNotificationRecords: readonly MockNotificationRecord[] = [
  {
    id: 'notification-access-review',
    category: 'notification',
    titleKey: 'messageCenter.items.accessReviewTitle',
    bodyKey: 'messageCenter.items.accessReviewBody',
    createdAt: '2026-07-13T07:30:00.000Z',
    tone: 'warning',
    recipientUserIds: [1],
    readByUserIds: [],
  },
  {
    id: 'notification-user-import',
    category: 'notification',
    titleKey: 'messageCenter.items.userImportTitle',
    bodyKey: 'messageCenter.items.userImportBody',
    createdAt: '2026-07-13T06:45:00.000Z',
    tone: 'success',
    recipientUserIds: [1, 2],
    readByUserIds: [],
  },
  {
    id: 'task-quarterly-access-review',
    category: 'task',
    titleKey: 'messageCenter.items.taskAccessReviewTitle',
    bodyKey: 'messageCenter.items.taskAccessReviewBody',
    createdAt: '2026-07-13T05:30:00.000Z',
    tone: 'warning',
    recipientUserIds: [1],
    readByUserIds: [],
  },
  {
    id: 'task-publish-release-notes',
    category: 'task',
    titleKey: 'messageCenter.items.taskReleaseNotesTitle',
    bodyKey: 'messageCenter.items.taskReleaseNotesBody',
    createdAt: '2026-07-13T04:30:00.000Z',
    tone: 'info',
    recipientUserIds: [2],
    readByUserIds: [],
  },
  {
    id: 'announcement-security-review',
    category: 'announcement',
    titleKey: 'messageCenter.items.securityAnnouncementTitle',
    bodyKey: 'messageCenter.items.securityAnnouncementBody',
    createdAt: '2026-07-13T01:00:00.000Z',
    tone: 'warning',
    recipientUserIds: 'all',
    readByUserIds: [],
  },
  {
    id: 'notification-release',
    category: 'notification',
    titleKey: 'messageCenter.items.releaseTitle',
    bodyKey: 'messageCenter.items.releaseBody',
    createdAt: '2026-07-12T03:00:00.000Z',
    tone: 'info',
    recipientUserIds: 'all',
    readByUserIds: [1, 2, 3, 4, 5, 6, 7, 8],
  },
]

const notificationRecords = initialNotificationRecords.map(copyNotificationRecord)
const categoryFilters = new Set<string>(['all', ...NOTIFICATION_CATEGORIES])
const readFilters = new Set<string>(NOTIFICATION_READ_FILTERS)

function isCategoryFilter(value: string): value is NotificationCategoryFilter {
  return categoryFilters.has(value)
}

function isReadFilter(value: string): value is NotificationReadFilter {
  return readFilters.has(value)
}

function copyNotificationRecord(record: MockNotificationRecord): MockNotificationRecord {
  return {
    ...record,
    recipientUserIds: record.recipientUserIds === 'all' ? 'all' : [...record.recipientUserIds],
    readByUserIds: [...record.readByUserIds],
  }
}

function canReceiveNotification(record: MockNotificationRecord, userId: number): boolean {
  return record.recipientUserIds === 'all' || record.recipientUserIds.includes(userId)
}

function getMessageCenterItem(record: MockNotificationRecord, userId: number): MessageCenterItem {
  const { recipientUserIds: _recipientUserIds, readByUserIds, ...notification } = record
  return { ...notification, isRead: readByUserIds.includes(userId) }
}

function getUserRecords(userId: number): MockNotificationRecord[] {
  return notificationRecords.filter((record) => canReceiveNotification(record, userId))
}

function getUnreadCount(userId: number): number {
  return getUserRecords(userId).filter((record) => !record.readByUserIds.includes(userId)).length
}

function getFailure(message: string, code: string, status = 400) {
  return HttpResponse.json<ApiResponse<null>>({ code, message, data: null }, { status })
}

function getFilters(request: Request):
  | {
      category: NotificationCategoryFilter
      read: NotificationReadFilter
    }
  | undefined {
  const requestUrl = new URL(request.url)
  const category = requestUrl.searchParams.get('category') ?? 'all'
  const read = requestUrl.searchParams.get('read') ?? 'all'
  if (!isCategoryFilter(category) || !isReadFilter(read)) return undefined

  return { category, read }
}

export function resetMockNotifications(): void {
  notificationRecords.splice(
    0,
    notificationRecords.length,
    ...initialNotificationRecords.map(copyNotificationRecord),
  )
}

export const listNotificationsHandler = http.get('/api/notifications', ({ request }) => {
  const authentication = authenticateMockRequest(request)
  if (!authentication.isAuthenticated) return authentication.response

  const filters = getFilters(request)
  if (!filters) return getFailure('消息筛选条件无效', 'INVALID_NOTIFICATION_FILTER')

  const items = getUserRecords(authentication.user.id)
    .map((record) => getMessageCenterItem(record, authentication.user.id))
    .filter((item) => filters.category === 'all' || item.category === filters.category)
    .filter(
      (item) =>
        filters.read === 'all' ||
        (filters.read === 'read' && item.isRead) ||
        (filters.read === 'unread' && !item.isRead),
    )
    .sort((leftItem, rightItem) => rightItem.createdAt.localeCompare(leftItem.createdAt))

  return HttpResponse.json<ApiResponse<MessageCenterResponse>>({
    code: 0,
    message: 'success',
    data: {
      items,
      total: items.length,
      unreadCount: getUnreadCount(authentication.user.id),
    },
  })
})

export const unreadNotificationCountHandler = http.get(
  '/api/notifications/unread-count',
  ({ request }) => {
    const authentication = authenticateMockRequest(request)
    if (!authentication.isAuthenticated) return authentication.response

    return HttpResponse.json<ApiResponse<NotificationUnreadResponse>>({
      code: 0,
      message: 'success',
      data: { unreadCount: getUnreadCount(authentication.user.id) },
    })
  },
)

export const markNotificationReadHandler = http.put<{ notificationId: string }>(
  '/api/notifications/:notificationId/read',
  ({ params, request }) => {
    const authentication = authenticateMockRequest(request)
    if (!authentication.isAuthenticated) return authentication.response

    const record = notificationRecords.find(
      (candidate) =>
        candidate.id === params.notificationId &&
        canReceiveNotification(candidate, authentication.user.id),
    )
    if (!record) return getFailure('消息不存在', 'NOTIFICATION_NOT_FOUND', 404)

    if (!record.readByUserIds.includes(authentication.user.id))
      record.readByUserIds.push(authentication.user.id)

    return HttpResponse.json<ApiResponse<MarkNotificationReadResponse>>({
      code: 0,
      message: 'updated',
      data: {
        item: getMessageCenterItem(record, authentication.user.id),
        unreadCount: getUnreadCount(authentication.user.id),
      },
    })
  },
)

export const markAllNotificationsReadHandler = http.post<never, MarkAllNotificationsReadInput>(
  '/api/notifications/read-all',
  async ({ request }) => {
    const authentication = authenticateMockRequest(request)
    if (!authentication.isAuthenticated) return authentication.response

    const requestBody = await readMockJsonBody(request, MARK_ALL_NOTIFICATIONS_READ_INPUT_SCHEMA, {
      code: 'INVALID_NOTIFICATION_CATEGORY',
      message: '消息分类无效',
    })
    if (!requestBody.isValid) return requestBody.response
    const input = requestBody.body

    const markedIds: string[] = []
    for (const record of getUserRecords(authentication.user.id)) {
      if (input.category !== 'all' && record.category !== input.category) continue
      if (record.readByUserIds.includes(authentication.user.id)) continue

      record.readByUserIds.push(authentication.user.id)
      markedIds.push(record.id)
    }

    return HttpResponse.json<ApiResponse<MarkAllNotificationsReadResponse>>({
      code: 0,
      message: 'updated',
      data: {
        markedIds,
        unreadCount: getUnreadCount(authentication.user.id),
      },
    })
  },
)

export const notificationHandlers = [
  listNotificationsHandler,
  unreadNotificationCountHandler,
  markNotificationReadHandler,
  markAllNotificationsReadHandler,
]
