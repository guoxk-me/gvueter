export const NOTIFICATION_CATEGORIES = ['notification', 'task', 'announcement'] as const
export const NOTIFICATION_READ_FILTERS = ['all', 'unread', 'read'] as const
export const NOTIFICATION_TONES = ['info', 'success', 'warning'] as const

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]
export type NotificationCategoryFilter = NotificationCategory | 'all'
export type NotificationReadFilter = (typeof NOTIFICATION_READ_FILTERS)[number]
export type NotificationTone = (typeof NOTIFICATION_TONES)[number]

export interface MessageCenterItem {
  id: string
  category: NotificationCategory
  titleKey: string
  bodyKey: string
  createdAt: string
  tone: NotificationTone
  isRead: boolean
}

export interface MessageCenterFilters {
  category: NotificationCategoryFilter
  read: NotificationReadFilter
}

export interface MessageCenterResponse {
  items: MessageCenterItem[]
  total: number
  unreadCount: number
}

export interface NotificationUnreadResponse {
  unreadCount: number
}

export interface MarkNotificationReadResponse {
  item: MessageCenterItem
  unreadCount: number
}

export interface MarkAllNotificationsReadInput {
  category: NotificationCategoryFilter
}

export interface MarkAllNotificationsReadResponse {
  markedIds: string[]
  unreadCount: number
}

export interface NotificationRealtimeEvent {
  eventId: string
  notification: MessageCenterItem
}
