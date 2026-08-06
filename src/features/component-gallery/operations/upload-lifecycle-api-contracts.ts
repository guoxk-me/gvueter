import type {
  DemoUploadChunkReceipt,
  DemoUploadCompletion,
  DemoUploadCompletionInput,
} from './upload-lifecycle'
import { z } from 'zod'
import { DEMO_UPLOAD_MIME_TYPES } from './upload-lifecycle'

// AI modified: chunk and completion payloads are checked before upload progress enters UI state.
export const DEMO_UPLOAD_CHUNK_RECEIPT_SCHEMA: z.ZodType<DemoUploadChunkReceipt> = z
  .object({
    receivedChunkCount: z.number().int().min(1).max(128),
  })
  .strict()

export const DEMO_UPLOAD_COMPLETION_SCHEMA: z.ZodType<DemoUploadCompletion> = z
  .object({
    serverFileId: z.string().trim().min(1).max(200),
    resultUrl: z.string().startsWith('/api/component-gallery/files/').max(4000),
  })
  .strict()

export const DEMO_UPLOAD_COMPLETION_INPUT_SCHEMA: z.ZodType<DemoUploadCompletionInput> = z
  .object({
    fileName: z.string().trim().min(1).max(180),
    mimeType: z.enum(DEMO_UPLOAD_MIME_TYPES),
    totalChunks: z.number().int().min(1).max(128),
  })
  .strict()
