export interface UploadPolicy {
  maxFileSizeBytes: number
  allowedExtensions: string[]
  updatedAt: string
}

export interface UploadBusinessRules {
  maxFileSizeBytes: number
  allowedExtensions: readonly string[]
}

export interface EffectiveUploadPolicy {
  maxFileSizeBytes: number
  allowedExtensions: string[]
}
