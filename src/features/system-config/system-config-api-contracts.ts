import type {
  EmailConfig,
  SiteConfig,
  SmsConfig,
  SystemConfig,
  SystemConfigInput,
  ThirdPartyConfig,
  UploadConfig,
  UploadProvider,
} from './types'
import { z } from 'zod'
import { SECRET_MASK, SMS_PROVIDERS, UPLOAD_PROVIDERS } from './types'

const SECRET_MASK_SCHEMA = z.union([z.literal(SECRET_MASK), z.null()])
function isSafeHttpUrl(urlText: string): boolean {
  try {
    // AI modified: reject URL-parser shorthands so runtime input matches the absolute OpenAPI contract.
    if (urlText !== urlText.trim() || !/^https?:\/\//.test(urlText))
      return false
    const url = new URL(urlText)
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
  }
  catch {
    return false
  }
}

const SAFE_HTTP_URL_SCHEMA = z
  .string()
  .max(4_000)
  .url()
  // AI modified: malformed URLs fail validation instead of throwing from a later refinement.
  .refine(isSafeHttpUrl, 'URL must use HTTP(S) without embedded credentials')
const OPTIONAL_SAFE_HTTP_URL_SCHEMA = z.union([z.literal(''), SAFE_HTTP_URL_SCHEMA])
const S3_REGION_SCHEMA = z.union([
  z.literal(''),
  z
    .string()
    .trim()
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]{0,99}$/),
])
const S3_PATH_PREFIX_SCHEMA = z.union([
  z.literal(''),
  z
    .string()
    .trim()
    .max(500)
    .regex(/^(?:[a-z0-9][\w.-]*\/)*[a-z0-9][\w.-]*$/i),
])

function isSafeS3BucketName(bucketName: string): boolean {
  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(bucketName))
    return false
  if (bucketName.length < 3 || bucketName.length > 63 || bucketName.includes('..'))
    return false
  return !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(bucketName)
}

const S3_BUCKET_NAME_SCHEMA = z
  .string()
  .trim()
  .max(63)
  .refine(bucketName => !bucketName || isSafeS3BucketName(bucketName), 'Invalid S3 bucket name')

interface S3ConfigurationFields {
  provider: UploadProvider
  endpointUrl: string
  region: string
  bucketName: string
  accessKeyId: string
}

function requireS3Configuration(upload: S3ConfigurationFields, context: z.RefinementCtx): void {
  if (upload.provider !== 's3')
    return

  for (const field of ['endpointUrl', 'region', 'bucketName', 'accessKeyId'] as const) {
    if (!upload[field]) {
      context.addIssue({
        code: 'custom',
        path: [field],
        message: `${field} is required for S3 storage`,
      })
    }
  }
}

const SITE_CONFIG_SCHEMA: z.ZodType<SiteConfig> = z
  .object({
    siteName: z.string().trim().min(1).max(120),
    publicUrl: SAFE_HTTP_URL_SCHEMA,
    supportEmail: z.string().trim().email().max(254),
    isMaintenanceMode: z.boolean(),
  })
  .strict()

const UPLOAD_CONFIG_SCHEMA: z.ZodType<UploadConfig> = z
  .object({
    provider: z.enum(UPLOAD_PROVIDERS),
    maxFileSizeMb: z.number().int().min(1).max(200),
    allowedExtensions: z
      .string()
      .max(2_000)
      .regex(/^[a-z0-9]+(?:,[a-z0-9]+)*$/i),
    endpointUrl: OPTIONAL_SAFE_HTTP_URL_SCHEMA,
    region: S3_REGION_SCHEMA,
    bucketName: S3_BUCKET_NAME_SCHEMA,
    pathPrefix: S3_PATH_PREFIX_SCHEMA,
    isPathStyle: z.boolean(),
    publicBaseUrl: OPTIONAL_SAFE_HTTP_URL_SCHEMA,
    accessKeyId: z.string().max(500),
    accessKeySecretMask: SECRET_MASK_SCHEMA,
  })
  .strict()
  .superRefine((upload, context) => {
    requireS3Configuration(upload, context)
    if (upload.provider === 's3' && upload.accessKeySecretMask === null) {
      context.addIssue({
        code: 'custom',
        path: ['accessKeySecretMask'],
        message: 'An S3 access key secret must be configured',
      })
    }
  })

const SMS_CONFIG_SCHEMA: z.ZodType<SmsConfig> = z
  .object({
    provider: z.enum(SMS_PROVIDERS),
    senderName: z.string().max(200),
    accessKeyId: z.string().max(500),
    accessKeySecretMask: SECRET_MASK_SCHEMA,
  })
  .strict()

const EMAIL_CONFIG_SCHEMA: z.ZodType<EmailConfig> = z
  .object({
    host: z.string().max(500),
    port: z.number().int().min(1).max(65_535),
    isSecure: z.boolean(),
    username: z.string().max(500),
    passwordMask: SECRET_MASK_SCHEMA,
    fromName: z.string().max(200),
    fromAddress: z.string().trim().email().max(254),
  })
  .strict()

const THIRD_PARTY_CONFIG_SCHEMA: z.ZodType<ThirdPartyConfig> = z
  .object({
    isSsoEnabled: z.boolean(),
    oauthClientId: z.string().max(500),
    oauthClientSecretMask: SECRET_MASK_SCHEMA,
    webhookUrl: OPTIONAL_SAFE_HTTP_URL_SCHEMA,
    webhookSigningSecretMask: SECRET_MASK_SCHEMA,
  })
  .strict()

// AI modified: the Mock write boundary applies the same bounded configuration contract as the form.
export const SYSTEM_CONFIG_INPUT_SCHEMA: z.ZodType<SystemConfigInput> = z
  .object({
    site: z
      .object({
        siteName: z.string().trim().min(1).max(120),
        publicUrl: SAFE_HTTP_URL_SCHEMA,
        supportEmail: z.string().trim().email().max(254),
        isMaintenanceMode: z.boolean(),
      })
      .strict(),
    upload: z
      .object({
        provider: z.enum(UPLOAD_PROVIDERS),
        maxFileSizeMb: z.number().int().min(1).max(200),
        allowedExtensions: z
          .string()
          .min(1)
          .max(2_000)
          .regex(/^[a-z0-9]+(?:,[a-z0-9]+)*$/i),
        endpointUrl: OPTIONAL_SAFE_HTTP_URL_SCHEMA,
        region: S3_REGION_SCHEMA,
        bucketName: S3_BUCKET_NAME_SCHEMA,
        pathPrefix: S3_PATH_PREFIX_SCHEMA,
        isPathStyle: z.boolean(),
        publicBaseUrl: OPTIONAL_SAFE_HTTP_URL_SCHEMA,
        accessKeyId: z.string().trim().max(500),
        accessKeySecret: z.string().max(4_096),
      })
      .strict()
      .superRefine(requireS3Configuration),
    sms: z
      .object({
        provider: z.enum(SMS_PROVIDERS),
        senderName: z.string().trim().max(200),
        accessKeyId: z.string().trim().max(500),
        accessKeySecret: z.string().max(4_096),
      })
      .strict(),
    email: z
      .object({
        host: z.string().trim().min(1).max(500),
        port: z.number().int().min(1).max(65_535),
        isSecure: z.boolean(),
        username: z.string().trim().min(1).max(500),
        password: z.string().max(4_096),
        fromName: z.string().trim().min(1).max(200),
        fromAddress: z.string().trim().email().max(254),
      })
      .strict(),
    thirdParty: z
      .object({
        isSsoEnabled: z.boolean(),
        oauthClientId: z.string().trim().max(500),
        oauthClientSecret: z.string().max(4_096),
        webhookUrl: OPTIONAL_SAFE_HTTP_URL_SCHEMA,
        webhookSigningSecret: z.string().max(4_096),
      })
      .strict(),
  })
  .strict()

// AI modified: public configuration responses cannot leak unexpected secret fields into form state.
export const SYSTEM_CONFIG_SCHEMA: z.ZodType<SystemConfig> = z
  .object({
    site: SITE_CONFIG_SCHEMA,
    upload: UPLOAD_CONFIG_SCHEMA,
    sms: SMS_CONFIG_SCHEMA,
    email: EMAIL_CONFIG_SCHEMA,
    thirdParty: THIRD_PARTY_CONFIG_SCHEMA,
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()
