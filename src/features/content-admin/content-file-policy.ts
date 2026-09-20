import type { ContentFileMimeType } from '@/features/content-admin/types/files'
import type { UploadBusinessRules } from '@/features/uploads'
import { CONTENT_FILE_MIME_TYPES } from '@/features/content-admin/types/files'

export const CONTENT_FILE_MAX_SIZE_BYTES = 5 * 1024 * 1024
export const CONTENT_FILE_EXTENSIONS_BY_MIME_TYPE: Record<ContentFileMimeType, readonly string[]>
  = {
    'application/pdf': ['pdf'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp'],
    'text/csv': ['csv'],
    'text/plain': ['txt'],
  }
export const CONTENT_FILE_ALLOWED_EXTENSIONS = Object.values(
  CONTENT_FILE_EXTENSIONS_BY_MIME_TYPE,
).flat()
export const CONTENT_FILE_UPLOAD_RULES = {
  maxFileSizeBytes: CONTENT_FILE_MAX_SIZE_BYTES,
  allowedExtensions: CONTENT_FILE_ALLOWED_EXTENSIONS,
} satisfies UploadBusinessRules

export function getContentFileExtension(fileName: string): string | undefined {
  const fileNameSegments = fileName.split('.')
  return fileNameSegments[fileNameSegments.length - 1]?.toLowerCase()
}

export function isContentFileExtensionCompatible(
  fileName: string,
  mimeType: ContentFileMimeType,
): boolean {
  const extension = getContentFileExtension(fileName)
  return Boolean(extension && CONTENT_FILE_EXTENSIONS_BY_MIME_TYPE[mimeType].includes(extension))
}

export function getContentFileMimeTypes(
  allowedExtensions: readonly string[],
): ContentFileMimeType[] {
  const allowedExtensionSet = new Set(allowedExtensions)
  return CONTENT_FILE_MIME_TYPES.filter(mimeType =>
    CONTENT_FILE_EXTENSIONS_BY_MIME_TYPE[mimeType].some(extension =>
      allowedExtensionSet.has(extension),
    ),
  )
}
