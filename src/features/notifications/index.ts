// AI modified: dashboard notifications use the feature's public mutation entry.
export { useNotificationReadMutations } from './composables/useMessageCenter'
export {
  useNotificationRealtime,
  useNotificationUnreadCount,
} from './composables/useNotificationRealtime'
export * from './notification-transport'
export * from './types'
