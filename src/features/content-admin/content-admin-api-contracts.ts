import type {
  AnnouncementInput,
  AnnouncementListResponse,
  AnnouncementRecord,
  AnnouncementStatusInput,
} from '@/features/content-admin/types/announcements'
import type {
  ContentFileListResponse,
  ContentFileRecord,
} from '@/features/content-admin/types/files'
import type {
  OperationLogListResponse,
  OperationLogRecord,
} from '@/features/content-admin/types/operation-logs'
import { z } from 'zod'
import {
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_STATUSES,
} from '@/features/content-admin/types/announcements'
import { CONTENT_FILE_MIME_TYPES } from '@/features/content-admin/types/files'
import { OPERATION_LOG_OUTCOMES } from '@/features/content-admin/types/operation-logs'

// AI modified: content administration responses are validated before records enter query caches.
export const ANNOUNCEMENT_RECORD_SCHEMA: z.ZodType<AnnouncementRecord> = z
  .object({
    id: z.string().trim().min(1).max(200),
    title: z.string().trim().min(1).max(500),
    content: z.string().max(200_000),
    priority: z.enum(ANNOUNCEMENT_PRIORITIES),
    status: z.enum(ANNOUNCEMENT_STATUSES),
    publishedAt: z.string().datetime({ offset: true }).optional(),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()

export const ANNOUNCEMENT_INPUT_SCHEMA: z.ZodType<AnnouncementInput> = z
  .object({
    title: z.string().trim().min(2).max(500),
    content: z.string().max(200_000),
    priority: z.enum(ANNOUNCEMENT_PRIORITIES),
  })
  .strict()

export const ANNOUNCEMENT_STATUS_INPUT_SCHEMA: z.ZodType<AnnouncementStatusInput> = z
  .object({
    status: z.enum(['published', 'offline']),
  })
  .strict()

export const ANNOUNCEMENT_LIST_RESPONSE_SCHEMA: z.ZodType<AnnouncementListResponse> = z
  .object({
    items: z.array(ANNOUNCEMENT_RECORD_SCHEMA).max(200),
  })
  .strict()

export const CONTENT_FILE_RECORD_SCHEMA: z.ZodType<ContentFileRecord> = z
  .object({
    id: z.string().trim().min(1).max(200),
    name: z.string().trim().min(1).max(500),
    mimeType: z.enum(CONTENT_FILE_MIME_TYPES),
    size: z.number().int().nonnegative(),
    uploadedBy: z.string().trim().min(1).max(200),
    uploadedAt: z.string().datetime({ offset: true }),
    previewUrl: z.string().max(4_000).optional(),
  })
  .strict()

export const CONTENT_FILE_LIST_RESPONSE_SCHEMA: z.ZodType<ContentFileListResponse> = z
  .object({
    items: z.array(CONTENT_FILE_RECORD_SCHEMA).max(200),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().min(1).max(200),
  })
  .strict()

export const OPERATION_LOG_RECORD_SCHEMA: z.ZodType<OperationLogRecord> = z
  .object({
    id: z.string().trim().min(1).max(200),
    occurredAt: z.string().datetime({ offset: true }),
    actorName: z.string().trim().min(1).max(200),
    actorEmailMasked: z.string().trim().min(1).max(254),
    action: z.string().trim().min(1).max(200),
    resource: z.string().trim().min(1).max(500),
    outcome: z.enum(OPERATION_LOG_OUTCOMES),
    summary: z.string().max(4_000),
    ipMasked: z.string().trim().min(1).max(100),
  })
  .strict()

export const OPERATION_LOG_LIST_RESPONSE_SCHEMA: z.ZodType<OperationLogListResponse> = z
  .object({
    items: z.array(OPERATION_LOG_RECORD_SCHEMA).max(200),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().min(1).max(200),
  })
  .strict()
