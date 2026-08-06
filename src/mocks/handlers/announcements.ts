import type {
  AnnouncementListResponse,
  AnnouncementRecord,
  AnnouncementStatusInput,
} from '@/features/content-admin/types/announcements'
import type { ApiResponse } from '@/lib/http'
import { http, HttpResponse } from 'msw'
import { sanitizeRichTextHtml } from '@/components/admin/rich-text-safety'
import {
  ANNOUNCEMENT_INPUT_SCHEMA,
  ANNOUNCEMENT_STATUS_INPUT_SCHEMA,
} from '@/features/content-admin/content-admin-api-contracts'
import { getAnnouncementTextPreview } from '@/features/content-admin/content-admin-rules'
import { readMockJsonBody } from '@/mocks/request-validation'
import { authorizeMockPermission } from './auth'
import { recordMockOperation } from './operation-logs'

const initialAnnouncements: AnnouncementRecord[] = [
  {
    id: 'announcement-access-review',
    title: 'Quarterly access review',
    content: '<p>Role owners must confirm privileged accounts before July 15.</p>',
    priority: 'urgent',
    status: 'published',
    publishedAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'announcement-release',
    title: 'Release candidate available',
    content: '<p>The latest administration workflow is ready for review.</p>',
    priority: 'normal',
    status: 'draft',
    updatedAt: '2026-07-08T08:00:00.000Z',
  },
]
const announcements = initialAnnouncements.map((announcement) => ({ ...announcement }))
let announcementSequence = 1
const MAX_MOCK_ANNOUNCEMENTS = 200

type PublishedMockAnnouncement = AnnouncementRecord & {
  status: 'published'
  publishedAt: string
}

function copyAnnouncement<Announcement extends AnnouncementRecord>(
  announcement: Announcement,
): Announcement {
  // AI modified: responses are sanitized again so legacy records cannot bypass the persistence gate.
  return { ...announcement, content: sanitizeRichTextHtml(announcement.content) }
}

function isPublishedAnnouncement(
  announcement: AnnouncementRecord,
): announcement is PublishedMockAnnouncement {
  return announcement.status === 'published' && Boolean(announcement.publishedAt)
}

export function getPublishedMockAnnouncements(): readonly PublishedMockAnnouncement[] {
  // AI modified: consumers receive isolated snapshots while this handler remains the sole mutable owner.
  return announcements
    .filter(isPublishedAnnouncement)
    .sort((leftAnnouncement, rightAnnouncement) =>
      rightAnnouncement.publishedAt.localeCompare(leftAnnouncement.publishedAt),
    )
    .map(copyAnnouncement)
}

function getAnnouncement(announcementId: string): AnnouncementRecord | undefined {
  return announcements.find((announcement) => announcement.id === announcementId)
}

function getAnnouncementFailure(message: string, code: string, status = 400) {
  return HttpResponse.json<ApiResponse<null>>({ code, message, data: null }, { status })
}

export function resetMockAnnouncements(): void {
  announcements.splice(
    0,
    announcements.length,
    ...initialAnnouncements.map((announcement) => ({ ...announcement })),
  )
  announcementSequence = 1
}

export const listAnnouncementsHandler = http.get('/api/announcements', ({ request }) => {
  const authentication = authorizeMockPermission(request, 'read', 'Content')
  if (!authentication.isAuthenticated) return authentication.response

  return HttpResponse.json<ApiResponse<AnnouncementListResponse>>({
    code: 0,
    message: 'success',
    data: { items: announcements.map(copyAnnouncement) },
  })
})

export const createAnnouncementHandler = http.post<never, Record<string, unknown>>(
  '/api/announcements',
  async ({ request }) => {
    // AI modified: content mutations follow the editable role policy instead of a hard-coded role.
    const authentication = authorizeMockPermission(request, 'create', 'Content')
    if (!authentication.isAuthenticated) return authentication.response
    const requestBody = await readMockJsonBody(request, ANNOUNCEMENT_INPUT_SCHEMA, {
      code: 'INVALID_ANNOUNCEMENT',
      message: '公告信息不完整',
    })
    if (!requestBody.isValid) return requestBody.response
    const input = requestBody.body
    const safeContent = sanitizeRichTextHtml(input.content)
    if (!getAnnouncementTextPreview(safeContent))
      return getAnnouncementFailure('公告信息不完整', 'INVALID_ANNOUNCEMENT')
    if (announcements.length >= MAX_MOCK_ANNOUNCEMENTS) {
      // AI modified: the mutable list cannot outgrow its executable response contract.
      return getAnnouncementFailure(
        '公告数量已达到演示环境上限',
        'ANNOUNCEMENT_CAPACITY_REACHED',
        409,
      )
    }

    const announcement: AnnouncementRecord = {
      id: `announcement-${announcementSequence++}`,
      title: input.title.trim(),
      // AI modified: only the allow-listed rich-text subset reaches mutable storage.
      content: safeContent,
      priority: input.priority,
      status: 'draft',
      updatedAt: new Date().toISOString(),
    }
    announcements.unshift(announcement)
    recordMockOperation(authentication.user, {
      action: 'create',
      resource: 'announcement',
      summary: `Created announcement ${announcement.id}.`,
    })
    return HttpResponse.json<ApiResponse<AnnouncementRecord>>(
      { code: 0, message: 'created', data: copyAnnouncement(announcement) },
      { status: 201 },
    )
  },
)

export const updateAnnouncementHandler = http.put<
  { announcementId: string },
  Record<string, unknown>
>('/api/announcements/:announcementId', async ({ params, request }) => {
  const authentication = authorizeMockPermission(request, 'update', 'Content')
  if (!authentication.isAuthenticated) return authentication.response
  const announcement = getAnnouncement(params.announcementId)
  if (!announcement) return getAnnouncementFailure('公告不存在', 'ANNOUNCEMENT_NOT_FOUND', 404)
  const requestBody = await readMockJsonBody(request, ANNOUNCEMENT_INPUT_SCHEMA, {
    code: 'INVALID_ANNOUNCEMENT',
    message: '公告信息不完整',
  })
  if (!requestBody.isValid) return requestBody.response
  const input = requestBody.body
  const safeContent = sanitizeRichTextHtml(input.content)
  if (!getAnnouncementTextPreview(safeContent))
    return getAnnouncementFailure('公告信息不完整', 'INVALID_ANNOUNCEMENT')

  Object.assign(announcement, {
    title: input.title.trim(),
    content: safeContent,
    priority: input.priority,
    updatedAt: new Date().toISOString(),
  })
  recordMockOperation(authentication.user, {
    action: 'update',
    resource: 'announcement',
    summary: `Updated announcement ${announcement.id}.`,
  })
  return HttpResponse.json<ApiResponse<AnnouncementRecord>>({
    code: 0,
    message: 'updated',
    data: copyAnnouncement(announcement),
  })
})

export const updateAnnouncementStatusHandler = http.put<
  { announcementId: string },
  AnnouncementStatusInput
>('/api/announcements/:announcementId/status', async ({ params, request }) => {
  const authentication = authorizeMockPermission(request, 'update', 'Content')
  if (!authentication.isAuthenticated) return authentication.response
  const announcement = getAnnouncement(params.announcementId)
  if (!announcement) return getAnnouncementFailure('公告不存在', 'ANNOUNCEMENT_NOT_FOUND', 404)
  const requestBody = await readMockJsonBody(request, ANNOUNCEMENT_STATUS_INPUT_SCHEMA, {
    code: 'INVALID_ANNOUNCEMENT_STATUS',
    message: '公告状态无效',
  })
  if (!requestBody.isValid) return requestBody.response
  const input = requestBody.body

  // AI modified: publication time is server-owned and only changes on a publish transition.
  announcement.status = input.status
  announcement.publishedAt =
    input.status === 'published' ? new Date().toISOString() : announcement.publishedAt
  announcement.updatedAt = new Date().toISOString()
  recordMockOperation(authentication.user, {
    action: input.status === 'published' ? 'publish' : 'offline',
    resource: 'announcement',
    summary: `${input.status === 'published' ? 'Published' : 'Took offline'} announcement ${announcement.id}.`,
  })
  return HttpResponse.json<ApiResponse<AnnouncementRecord>>({
    code: 0,
    message: 'updated',
    data: copyAnnouncement(announcement),
  })
})

export const deleteAnnouncementHandler = http.delete<{ announcementId: string }>(
  '/api/announcements/:announcementId',
  ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'delete', 'Content')
    if (!authentication.isAuthenticated) return authentication.response
    const announcement = getAnnouncement(params.announcementId)
    if (!announcement) return getAnnouncementFailure('公告不存在', 'ANNOUNCEMENT_NOT_FOUND', 404)
    announcements.splice(announcements.indexOf(announcement), 1)
    recordMockOperation(authentication.user, {
      action: 'delete',
      resource: 'announcement',
      summary: `Deleted announcement ${announcement.id}.`,
    })
    return HttpResponse.json<ApiResponse<null>>({ code: 0, message: 'deleted', data: null })
  },
)

export const announcementHandlers = [
  listAnnouncementsHandler,
  createAnnouncementHandler,
  updateAnnouncementHandler,
  updateAnnouncementStatusHandler,
  deleteAnnouncementHandler,
]
