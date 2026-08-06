import type { UploadPolicy } from '@/features/uploads/types'
import { z } from 'zod'
import { MAX_UPLOAD_POLICY_BYTES } from '@/features/uploads/upload-policy'

export const UPLOAD_POLICY_SCHEMA: z.ZodType<UploadPolicy> = z
  .object({
    maxFileSizeBytes: z.number().int().min(1).max(MAX_UPLOAD_POLICY_BYTES),
    allowedExtensions: z
      .array(z.string().regex(/^[a-z0-9]+$/))
      .min(1)
      .max(100)
      .refine(
        (extensions) => new Set(extensions).size === extensions.length,
        'Upload extensions must be unique',
      ),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()
