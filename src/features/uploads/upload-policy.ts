import type {
  EffectiveUploadPolicy,
  UploadBusinessRules,
  UploadPolicy,
} from '@/features/uploads/types'

export const MEBIBYTE_IN_BYTES = 1024 * 1024
export const MAX_UPLOAD_POLICY_BYTES = 200 * MEBIBYTE_IN_BYTES

export function applyUploadPolicy(
  policy: UploadPolicy,
  businessRules: UploadBusinessRules,
): EffectiveUploadPolicy {
  const configuredExtensions = new Set(
    policy.allowedExtensions.map((extension) => extension.toLowerCase()),
  )

  // AI modified: global upload settings can only narrow each module's stricter business rules.
  return {
    maxFileSizeBytes: Math.min(policy.maxFileSizeBytes, businessRules.maxFileSizeBytes),
    allowedExtensions: businessRules.allowedExtensions.filter((extension) =>
      configuredExtensions.has(extension.toLowerCase()),
    ),
  }
}
