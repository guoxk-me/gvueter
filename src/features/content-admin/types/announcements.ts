export const ANNOUNCEMENT_STATUSES = ['draft', 'published', 'offline'] as const
export const ANNOUNCEMENT_PRIORITIES = ['normal', 'important', 'urgent'] as const

export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number]
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number]

export interface AnnouncementRecord {
  id: string
  title: string
  content: string
  priority: AnnouncementPriority
  status: AnnouncementStatus
  publishedAt?: string
  updatedAt: string
}

export interface AnnouncementInput {
  title: string
  content: string
  priority: AnnouncementPriority
}

export interface AnnouncementListResponse {
  items: AnnouncementRecord[]
}

export interface AnnouncementStatusInput {
  status: Extract<AnnouncementStatus, 'published' | 'offline'>
}
