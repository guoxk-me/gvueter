import type { SystemConfig, SystemConfigInput } from '@/features/system-config/types'
import type { ApiResponse } from '@/lib/http'
import { http, HttpResponse } from 'msw'
import { SYSTEM_CONFIG_INPUT_SCHEMA } from '@/features/system-config/system-config-api-contracts'
import { SECRET_MASK } from '@/features/system-config/types'
import {
  getMockSsoConfiguration,
  resetMockSsoConfiguration,
  setMockSsoEnabled,
} from '@/mocks/data/sso'
import {
  getMockUploadConfig,
  resetMockUploadConfig,
  updateMockUploadConfig,
} from '@/mocks/data/upload-config'
import { readMockJsonBody } from '@/mocks/request-validation'
import { authorizeMockPermission } from './auth'
import { recordMockOperation } from './operation-logs'

interface StoredSystemConfig extends Omit<SystemConfig, 'email' | 'sms' | 'thirdParty' | 'upload'> {
  sms: Omit<SystemConfig['sms'], 'accessKeySecretMask'> & { accessKeySecret: string }
  email: Omit<SystemConfig['email'], 'passwordMask'> & { password: string }
  thirdParty: Omit<
    SystemConfig['thirdParty'],
    'isSsoEnabled' | 'oauthClientSecretMask' | 'webhookSigningSecretMask'
  > & {
    oauthClientSecret: string
    webhookSigningSecret: string
  }
}

const initialSystemConfig: StoredSystemConfig = {
  site: {
    siteName: 'Admin Panel',
    publicUrl: 'https://admin.example.com',
    supportEmail: 'support@example.com',
    isMaintenanceMode: false,
  },
  sms: {
    provider: 'aliyun',
    senderName: 'AdminPanel',
    accessKeyId: 'mock-sms-key',
    accessKeySecret: 'mock-sms-secret',
  },
  email: {
    host: 'smtp.example.com',
    port: 465,
    isSecure: true,
    username: 'notifications@example.com',
    password: 'mock-email-password',
    fromName: 'Admin Panel',
    fromAddress: 'notifications@example.com',
  },
  thirdParty: {
    oauthClientId: 'mock-oauth-client',
    oauthClientSecret: 'mock-oauth-secret',
    webhookUrl: 'https://hooks.example.com/admin-events',
    webhookSigningSecret: 'mock-webhook-secret',
  },
  updatedAt: '2026-07-01T08:00:00.000Z',
}

let systemConfig: StoredSystemConfig = structuredClone(initialSystemConfig)

function getSecretMask(secret: string): typeof SECRET_MASK | null {
  return secret ? SECRET_MASK : null
}

export function getRetainedSecret(currentSecret: string, requestedSecret: string): string {
  // AI modified: an empty secret field means retain the backend value, never erase it accidentally.
  return requestedSecret.trim() || currentSecret
}

function getPublicSystemConfig(): SystemConfig {
  // AI modified: API responses are reconstructed from an explicit public allow-list of fields.
  return {
    site: { ...systemConfig.site },
    upload: getMockUploadConfig(),
    sms: {
      provider: systemConfig.sms.provider,
      senderName: systemConfig.sms.senderName,
      accessKeyId: systemConfig.sms.accessKeyId,
      accessKeySecretMask: getSecretMask(systemConfig.sms.accessKeySecret),
    },
    email: {
      host: systemConfig.email.host,
      port: systemConfig.email.port,
      isSecure: systemConfig.email.isSecure,
      username: systemConfig.email.username,
      passwordMask: getSecretMask(systemConfig.email.password),
      fromName: systemConfig.email.fromName,
      fromAddress: systemConfig.email.fromAddress,
    },
    thirdParty: {
      isSsoEnabled: getMockSsoConfiguration().isEnabled,
      oauthClientId: systemConfig.thirdParty.oauthClientId,
      oauthClientSecretMask: getSecretMask(systemConfig.thirdParty.oauthClientSecret),
      webhookUrl: systemConfig.thirdParty.webhookUrl,
      webhookSigningSecretMask: getSecretMask(systemConfig.thirdParty.webhookSigningSecret),
    },
    updatedAt: systemConfig.updatedAt,
  }
}

export function resetMockSystemConfig(): void {
  systemConfig = structuredClone(initialSystemConfig)
  resetMockSsoConfiguration()
  resetMockUploadConfig()
}

export const getSystemConfigHandler = http.get('/api/system-config', ({ request }) => {
  const authentication = authorizeMockPermission(request, 'read', 'Settings')
  if (!authentication.isAuthenticated)
    return authentication.response

  return HttpResponse.json<ApiResponse<SystemConfig>>(
    {
      code: 0,
      message: 'success',
      data: getPublicSystemConfig(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
})

export const updateSystemConfigHandler = http.put<never, SystemConfigInput>(
  '/api/system-config',
  async ({ request }) => {
    const authentication = authorizeMockPermission(request, 'update', 'Settings')
    if (!authentication.isAuthenticated)
      return authentication.response

    const requestBody = await readMockJsonBody(request, SYSTEM_CONFIG_INPUT_SCHEMA, {
      code: 'INVALID_SYSTEM_CONFIG',
      message: '系统配置信息不完整',
    })
    if (!requestBody.isValid)
      return requestBody.response
    const input: SystemConfigInput = requestBody.body
    const { isSsoEnabled, ...thirdPartyInput } = input.thirdParty
    const updatedAt = new Date().toISOString()
    // AI modified: the admin toggle now controls the public login option and SSO start endpoint.
    setMockSsoEnabled(isSsoEnabled)
    // AI modified: upload policy state is shared with every server-side upload boundary.
    updateMockUploadConfig(input.upload, updatedAt)

    systemConfig = {
      site: { ...input.site },
      sms: {
        ...input.sms,
        accessKeySecret: getRetainedSecret(
          systemConfig.sms.accessKeySecret,
          input.sms.accessKeySecret,
        ),
      },
      email: {
        ...input.email,
        password: getRetainedSecret(systemConfig.email.password, input.email.password),
      },
      thirdParty: {
        ...thirdPartyInput,
        oauthClientSecret: getRetainedSecret(
          systemConfig.thirdParty.oauthClientSecret,
          input.thirdParty.oauthClientSecret,
        ),
        webhookSigningSecret: getRetainedSecret(
          systemConfig.thirdParty.webhookSigningSecret,
          input.thirdParty.webhookSigningSecret,
        ),
      },
      updatedAt,
    }
    recordMockOperation(authentication.user, {
      action: 'update',
      resource: 'system-config',
      summary: 'Updated grouped system configuration.',
    })

    return HttpResponse.json<ApiResponse<SystemConfig>>(
      {
        code: 0,
        message: 'updated',
        data: getPublicSystemConfig(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  },
)

export const systemConfigHandlers = [getSystemConfigHandler, updateSystemConfigHandler]
