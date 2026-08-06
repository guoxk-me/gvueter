export const CONTENT_ADMIN_TABS = ['announcements', 'files', 'operation-logs'] as const

export type ContentAdminTab = (typeof CONTENT_ADMIN_TABS)[number]
