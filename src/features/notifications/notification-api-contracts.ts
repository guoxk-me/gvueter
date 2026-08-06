import type {
  MarkAllNotificationsReadInput,
  MarkAllNotificationsReadResponse,
  MarkNotificationReadResponse,
  MessageCenterItem,
  MessageCenterResponse,
  NotificationRealtimeEvent,
  NotificationUnreadResponse,
} from './types'
import { z } from 'zod'
import { NOTIFICATION_CATEGORIES, NOTIFICATION_TONES } from './types'

// AI modified: notification HTTP and realtime payloads share one strict item boundary.
export const MESSAGE_CENTER_ITEM_SCHEMA: z.ZodType<MessageCenterItem> = z
  .object({
    id: z.string().trim().min(1).max(200),
    category: z.enum(NOTIFICATION_CATEGORIES),
    titleKey: z.string().trim().min(1).max(300),
    bodyKey: z.string().trim().min(1).max(300),
    createdAt: z.string().datetime({ offset: true }),
    tone: z.enum(NOTIFICATION_TONES),
    isRead: z.boolean(),
  })
  .strict()

export const MARK_ALL_NOTIFICATIONS_READ_INPUT_SCHEMA: z.ZodType<MarkAllNotificationsReadInput> = z
  .object({
    category: z.enum(['all', ...NOTIFICATION_CATEGORIES]),
  })
  .strict()

export const MESSAGE_CENTER_RESPONSE_SCHEMA: z.ZodType<MessageCenterResponse> = z
  .object({
    items: z.array(MESSAGE_CENTER_ITEM_SCHEMA).max(200),
    total: z.number().int().nonnegative(),
    unreadCount: z.number().int().nonnegative(),
  })
  .strict()

export const NOTIFICATION_UNREAD_RESPONSE_SCHEMA: z.ZodType<NotificationUnreadResponse> = z
  .object({
    unreadCount: z.number().int().nonnegative(),
  })
  .strict()

export const MARK_NOTIFICATION_READ_RESPONSE_SCHEMA: z.ZodType<MarkNotificationReadResponse> = z
  .object({
    item: MESSAGE_CENTER_ITEM_SCHEMA,
    unreadCount: z.number().int().nonnegative(),
  })
  .strict()

export const MARK_ALL_NOTIFICATIONS_READ_RESPONSE_SCHEMA: z.ZodType<MarkAllNotificationsReadResponse> =
  z
    .object({
      markedIds: z.array(z.string().trim().min(1).max(200)).max(200),
      unreadCount: z.number().int().nonnegative(),
    })
    .strict()

export const NOTIFICATION_REALTIME_EVENT_SCHEMA: z.ZodType<NotificationRealtimeEvent> = z
  .object({
    eventId: z.string().trim().min(1).max(200),
    notification: MESSAGE_CENTER_ITEM_SCHEMA,
  })
  .strict()
