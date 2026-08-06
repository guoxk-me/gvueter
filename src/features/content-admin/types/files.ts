export const CONTENT_FILE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'text/plain',
] as const

export type ContentFileMimeType = (typeof CONTENT_FILE_MIME_TYPES)[number]

export interface ContentFileRecord {
  id: string
  name: string
  mimeType: ContentFileMimeType
  size: number
  uploadedBy: string
  uploadedAt: string
  previewUrl?: string
}

export interface ContentFileListResponse {
  items: ContentFileRecord[]
  total: number
  page: number
  pageSize: number
}

export interface ContentFileListFilters {
  keyword: string
  page: number
  pageSize: number
}
