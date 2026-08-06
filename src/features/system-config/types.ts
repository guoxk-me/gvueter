export const SECRET_MASK = '••••••••' as const
export const UPLOAD_PROVIDERS = ['local', 's3'] as const
export const SMS_PROVIDERS = ['disabled', 'aliyun', 'twilio'] as const
export const SYSTEM_CONFIG_SECTIONS = ['site', 'upload', 'sms', 'email', 'third-party'] as const

export type SecretMask = typeof SECRET_MASK | null
export type UploadProvider = (typeof UPLOAD_PROVIDERS)[number]
export type SmsProvider = (typeof SMS_PROVIDERS)[number]
export type SystemConfigSection = (typeof SYSTEM_CONFIG_SECTIONS)[number]

export interface SiteConfig {
  siteName: string
  publicUrl: string
  supportEmail: string
  isMaintenanceMode: boolean
}

export interface UploadConfig {
  provider: UploadProvider
  maxFileSizeMb: number
  allowedExtensions: string
  endpointUrl: string
  region: string
  bucketName: string
  pathPrefix: string
  isPathStyle: boolean
  publicBaseUrl: string
  accessKeyId: string
  accessKeySecretMask: SecretMask
}

export interface SmsConfig {
  provider: SmsProvider
  senderName: string
  accessKeyId: string
  accessKeySecretMask: SecretMask
}

export interface EmailConfig {
  host: string
  port: number
  isSecure: boolean
  username: string
  passwordMask: SecretMask
  fromName: string
  fromAddress: string
}

export interface ThirdPartyConfig {
  isSsoEnabled: boolean
  oauthClientId: string
  oauthClientSecretMask: SecretMask
  webhookUrl: string
  webhookSigningSecretMask: SecretMask
}

export interface SystemConfig {
  site: SiteConfig
  upload: UploadConfig
  sms: SmsConfig
  email: EmailConfig
  thirdParty: ThirdPartyConfig
  updatedAt: string
}

export interface SystemConfigInput {
  site: SiteConfig
  upload: Omit<UploadConfig, 'accessKeySecretMask'> & { accessKeySecret: string }
  sms: Omit<SmsConfig, 'accessKeySecretMask'> & { accessKeySecret: string }
  email: Omit<EmailConfig, 'passwordMask'> & { password: string }
  thirdParty: Omit<ThirdPartyConfig, 'oauthClientSecretMask' | 'webhookSigningSecretMask'> & {
    oauthClientSecret: string
    webhookSigningSecret: string
  }
}
