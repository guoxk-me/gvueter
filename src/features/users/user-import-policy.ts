import type { UploadBusinessRules } from '@/features/uploads'

export const USER_IMPORT_MAX_SIZE_BYTES = 256 * 1024
export const USER_IMPORT_UPLOAD_RULES = {
  maxFileSizeBytes: USER_IMPORT_MAX_SIZE_BYTES,
  allowedExtensions: ['csv'],
} satisfies UploadBusinessRules
