import type { SystemConfig, SystemConfigInput } from '@/features/system-config/types'
import type { UploadPolicy } from '@/features/uploads/types'
import { SECRET_MASK } from '@/features/system-config/types'
import { MEBIBYTE_IN_BYTES } from '@/features/uploads/upload-policy'

interface StoredUploadConfig extends Omit<SystemConfig['upload'], 'accessKeySecretMask'> {
  accessKeySecret: string
}

const initialUploadConfig: StoredUploadConfig = {
  provider: 's3',
  maxFileSizeMb: 20,
  allowedExtensions: 'jpg,jpeg,png,webp,pdf,csv,txt',
  endpointUrl: 'https://s3.us-east-1.amazonaws.com',
  region: 'us-east-1',
  bucketName: 'gvueter-assets',
  pathPrefix: 'uploads',
  isPathStyle: false,
  publicBaseUrl: 'https://assets.example.com',
  accessKeyId: 'mock-access-key',
  accessKeySecret: 'mock-upload-secret',
}
const initialUpdatedAt = '2026-07-01T08:00:00.000Z'

let uploadConfig = structuredClone(initialUploadConfig)
let uploadPolicyUpdatedAt = initialUpdatedAt

export function getMockUploadConfig(): SystemConfig['upload'] {
  // AI modified: upload consumers receive only an explicit admin projection, never the stored secret.
  return {
    provider: uploadConfig.provider,
    maxFileSizeMb: uploadConfig.maxFileSizeMb,
    allowedExtensions: uploadConfig.allowedExtensions,
    endpointUrl: uploadConfig.endpointUrl,
    region: uploadConfig.region,
    bucketName: uploadConfig.bucketName,
    pathPrefix: uploadConfig.pathPrefix,
    isPathStyle: uploadConfig.isPathStyle,
    publicBaseUrl: uploadConfig.publicBaseUrl,
    accessKeyId: uploadConfig.accessKeyId,
    accessKeySecretMask: uploadConfig.accessKeySecret ? SECRET_MASK : null,
  }
}

export function getMockUploadPolicy(): UploadPolicy {
  // AI modified: ordinary upload pages receive policy limits without storage topology or credentials.
  return {
    maxFileSizeBytes: uploadConfig.maxFileSizeMb * MEBIBYTE_IN_BYTES,
    allowedExtensions: uploadConfig.allowedExtensions.split(','),
    updatedAt: uploadPolicyUpdatedAt,
  }
}

export function updateMockUploadConfig(
  input: SystemConfigInput['upload'],
  updatedAt: string,
): void {
  const allowedExtensions = [...new Set(input.allowedExtensions.toLowerCase().split(','))].join(',')

  // AI modified: blank secret inputs retain the backend value while policy fields update atomically.
  uploadConfig = {
    ...input,
    allowedExtensions,
    accessKeySecret: input.accessKeySecret.trim() || uploadConfig.accessKeySecret,
  }
  uploadPolicyUpdatedAt = updatedAt
}

export function resetMockUploadConfig(): void {
  uploadConfig = structuredClone(initialUploadConfig)
  uploadPolicyUpdatedAt = initialUpdatedAt
}
