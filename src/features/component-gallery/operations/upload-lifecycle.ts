export type DemoUploadStatus =
  | 'waiting'
  | 'uploading'
  | 'paused'
  | 'succeeded'
  | 'failed'
  | 'canceled'

export interface DemoUploadTask {
  id: string
  file: File
  status: DemoUploadStatus
  completedChunks: number
  totalChunks: number
  progress: number
  error?: string
  serverFileId?: string
  resultUrl?: string
}

export interface DemoUploadChunkReceipt {
  receivedChunkCount: number
}

export interface DemoUploadCompletion {
  serverFileId: string
  resultUrl: string
}

export const DEMO_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/csv',
] as const

export type DemoUploadMimeType = (typeof DEMO_UPLOAD_MIME_TYPES)[number]

export interface DemoUploadCompletionInput {
  fileName: string
  mimeType: DemoUploadMimeType
  totalChunks: number
}

export const DEMO_UPLOAD_CHUNK_SIZE = 64 * 1024

// AI modified: upload lifecycle state stays separate from FileUpload's local-selection contract.
export function createDemoUploadTask(file: File): DemoUploadTask {
  const totalChunks = Math.max(Math.ceil(file.size / DEMO_UPLOAD_CHUNK_SIZE), 1)
  return {
    id:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    status: 'waiting',
    completedChunks: 0,
    totalChunks,
    progress: 0,
  }
}
