import type { ContentFileRecord } from '@/features/content-admin/types/files'
import type { SystemConfig, SystemConfigInput } from '@/features/system-config/types'
import type { UploadPolicy } from '@/features/uploads/types'
import type { SsoConfiguration } from '@/types/auth'
import { File as NodeFile } from 'node:buffer'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { defineComponent, shallowRef } from 'vue'
import SystemConfigForm from '@/features/system-config/components/SystemConfigForm.vue'
import { SECRET_MASK } from '@/features/system-config/types'
import { i18n } from '@/i18n'
import { get, post, put, uploadFileBytes } from '@/lib/http'
import { generateMockToken } from '@/mocks/data/users'
import { getRetainedSecret, resetMockSystemConfig } from '@/mocks/handlers/system-config'

const configInput: SystemConfigInput = {
  site: {
    siteName: 'Admin Panel',
    publicUrl: 'https://admin.example.com',
    supportEmail: 'support@example.com',
    isMaintenanceMode: false,
  },
  upload: {
    provider: 's3',
    maxFileSizeMb: 30,
    allowedExtensions: 'jpg,png,pdf',
    endpointUrl: 'https://s3.us-east-1.amazonaws.com',
    region: 'us-east-1',
    bucketName: 'gvueter-assets',
    pathPrefix: 'uploads',
    isPathStyle: false,
    publicBaseUrl: 'https://assets.example.com',
    accessKeyId: 'updated-upload-key',
    accessKeySecret: '',
  },
  sms: {
    provider: 'aliyun',
    senderName: 'AdminPanel',
    accessKeyId: 'updated-sms-key',
    accessKeySecret: '',
  },
  email: {
    host: 'smtp.example.com',
    port: 465,
    isSecure: true,
    username: 'notifications@example.com',
    password: '',
    fromName: 'Admin Panel',
    fromAddress: 'notifications@example.com',
  },
  thirdParty: {
    isSsoEnabled: false,
    oauthClientId: 'updated-oauth-client',
    oauthClientSecret: '',
    webhookUrl: 'https://hooks.example.com/admin-events',
    webhookSigningSecret: '',
  },
}

const smallPngBytes = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 4, 0, 0,
  0, 181, 28, 12, 2, 0, 0, 0, 11, 73, 68, 65, 84, 120, 218, 99, 252, 255, 31, 0, 3, 3, 2, 0, 238,
  254, 127, 179, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
])

describe('system configuration', () => {
  beforeEach(() => {
    resetMockSystemConfig()
    localStorage.removeItem('auth_token')
    sessionStorage.setItem('auth_token', generateMockToken(1))
  })

  afterEach(() => {
    localStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_token')
  })

  it('returns only secret masks and never exposes mock credentials', async () => {
    const config = await get<SystemConfig>('/system-config')
    const serializedConfig = JSON.stringify(config)

    expect(config.upload.accessKeySecretMask).toBe(SECRET_MASK)
    expect(config.sms.accessKeySecretMask).toBe(SECRET_MASK)
    expect(config.email.passwordMask).toBe(SECRET_MASK)
    expect(config.thirdParty.oauthClientSecretMask).toBe(SECRET_MASK)
    expect(config.thirdParty.isSsoEnabled).toBe(true)
    expect(serializedConfig).not.toContain('mock-upload-secret')
    expect(serializedConfig).not.toContain('mock-sms-secret')
    expect(serializedConfig).not.toContain('mock-email-password')
    expect(serializedConfig).not.toContain('mock-oauth-secret')
    expect(serializedConfig).not.toContain('mock-webhook-secret')
  })

  it('retains configured secrets for blank submissions and returns the saved public values', async () => {
    expect(getRetainedSecret('current-secret', '   ')).toBe('current-secret')
    expect(getRetainedSecret('current-secret', 'next-secret')).toBe('next-secret')

    const savedConfig = await put<SystemConfig>('/system-config', {
      ...configInput,
      site: { ...configInput.site, siteName: 'Operations Console' },
    })

    expect(savedConfig.site.siteName).toBe('Operations Console')
    expect(savedConfig.upload.accessKeySecretMask).toBe(SECRET_MASK)
    expect(savedConfig.email.passwordMask).toBe(SECRET_MASK)
    expect('accessKeySecret' in savedConfig.upload).toBe(false)
    expect('password' in savedConfig.email).toBe(false)
    await expect(get<SsoConfiguration>('/auth/sso/config')).resolves.toMatchObject({
      isEnabled: false,
    })
    // AI modified: saving the admin toggle closes the loop at the public start boundary too.
    await expect(post('/auth/sso/start', { returnTo: '/users' })).rejects.toMatchObject({
      code: 'SSO_NOT_CONFIGURED',
      status: 400,
    })
  })

  it('rejects non-admin reads and writes at the API boundary', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(2))

    // AI modified: settings data requires backend read permission, not only route visibility.
    await expect(get<SystemConfig>('/system-config')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
    await expect(put('/system-config', configInput)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
  })

  it('exposes only the safe upload policy projection to authenticated upload consumers', async () => {
    const administratorPolicy = await get<UploadPolicy>('/uploads/policy')

    // AI modified: the ordinary upload boundary is an explicit safe allow-list, not an admin DTO.
    expect(Object.keys(administratorPolicy).sort()).toEqual(
      ['allowedExtensions', 'maxFileSizeBytes', 'updatedAt'].sort(),
    )
    expect(JSON.stringify(administratorPolicy)).not.toMatch(
      /provider|endpointUrl|bucketName|accessKey/i,
    )

    sessionStorage.setItem('auth_token', generateMockToken(2))
    await expect(get<UploadPolicy>('/uploads/policy')).resolves.toEqual(administratorPolicy)
    await expect(get<SystemConfig>('/system-config')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })

    sessionStorage.removeItem('auth_token')
    await expect(get<UploadPolicy>('/uploads/policy')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    })
  })

  it('applies a saved upload policy immediately at the content upload boundary', async () => {
    const savedConfig = await put<SystemConfig>('/system-config', {
      ...configInput,
      upload: {
        ...configInput.upload,
        maxFileSizeMb: 1,
        allowedExtensions: 'png',
      },
    })
    const policy = await get<UploadPolicy>('/uploads/policy')

    expect(policy).toEqual({
      maxFileSizeBytes: 1024 * 1024,
      allowedExtensions: ['png'],
      updatedAt: savedConfig.updatedAt,
    })
    await expect(
      uploadFileBytes(
        '/content-files',
        new NodeFile(['release notes'], 'release-notes.txt', { type: 'text/plain' }),
      ),
    ).rejects.toMatchObject({ code: 'CONTENT_FILE_EXTENSION_DISABLED', status: 415 })

    const oversizedPngBytes = new Uint8Array(1024 * 1024 + 1)
    oversizedPngBytes.set(smallPngBytes)
    await expect(
      uploadFileBytes(
        '/content-files',
        new NodeFile([oversizedPngBytes], 'oversized.png', { type: 'image/png' }),
      ),
    ).rejects.toMatchObject({ code: 'CONTENT_FILE_TOO_LARGE', status: 413 })

    // AI modified: the same saved policy still permits a valid in-policy image end to end.
    await expect(
      uploadFileBytes<ContentFileRecord>(
        '/content-files',
        new NodeFile([smallPngBytes], 'pixel.png', { type: 'image/png' }),
      ),
    ).resolves.toMatchObject({
      name: 'pixel.png',
      mimeType: 'image/png',
      size: smallPngBytes.byteLength,
    })
  })

  it('validates configuration again at the API boundary', async () => {
    await expect(
      put('/system-config', {
        ...configInput,
        site: { ...configInput.site, publicUrl: 'not-a-url' },
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_SYSTEM_CONFIG',
      status: 400,
    })
  })

  it.each([
    'http:storage.example.com',
    'http:/storage.example.com',
    'https://user:pass@s3.example.com',
    'https://s3.example.com ',
  ])('rejects non-canonical or credential-bearing S3 endpoint %s', async (endpointUrl) => {
    await expect(
      put('/system-config', {
        ...configInput,
        upload: { ...configInput.upload, endpointUrl },
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_SYSTEM_CONFIG',
      status: 400,
    })
  })

  it('rejects extension lists with transport-level whitespace', async () => {
    await expect(
      put('/system-config', {
        ...configInput,
        upload: { ...configInput.upload, allowedExtensions: ' png' },
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_SYSTEM_CONFIG',
      status: 400,
    })
  })

  it('accepts local storage without object-store-only fields', async () => {
    const savedConfig = await put<SystemConfig>('/system-config', {
      ...configInput,
      upload: {
        ...configInput.upload,
        provider: 'local',
        endpointUrl: '',
        region: '',
        bucketName: '',
        pathPrefix: '',
        publicBaseUrl: '',
        accessKeyId: '',
        accessKeySecret: '',
      },
    })

    // AI modified: local storage does not inherit hidden S3 validation requirements.
    expect(savedConfig.upload).toMatchObject({
      provider: 'local',
      endpointUrl: '',
      region: '',
      bucketName: '',
      accessKeyId: '',
    })
  })

  it.each(['endpointUrl', 'region', 'bucketName', 'accessKeyId'] as const)(
    'rejects S3 storage when %s is missing',
    async (missingField) => {
      await expect(
        put('/system-config', {
          ...configInput,
          upload: {
            ...configInput.upload,
            [missingField]: '',
          },
        }),
      ).rejects.toMatchObject({
        code: 'INVALID_SYSTEM_CONFIG',
        status: 400,
      })
    },
  )

  it('exposes all five configuration groups through the validated form surface', async () => {
    const config = await get<SystemConfig>('/system-config')
    const wrapper = mount(SystemConfigForm, {
      props: { config, isSaving: false, isReadOnly: false },
      global: { plugins: [i18n] },
    })

    expect(wrapper.findAll('[role="tab"]')).toHaveLength(5)
    expect(wrapper.text()).toContain(i18n.global.t('systemConfig.formTitle'))
    expect(wrapper.text()).toContain(i18n.global.t('systemConfig.save'))

    wrapper.unmount()
  })

  it('shows S3 fields only when object storage is selected', async () => {
    const s3Config = await get<SystemConfig>('/system-config')
    const s3Wrapper = mount(SystemConfigForm, {
      props: {
        config: s3Config,
        isSaving: false,
        isReadOnly: false,
        activeSection: 'upload',
      },
      global: { plugins: [i18n] },
    })
    const s3FieldLabels = [
      i18n.global.t('systemConfig.upload.endpointUrl'),
      i18n.global.t('systemConfig.upload.region'),
      i18n.global.t('systemConfig.upload.bucketName'),
      i18n.global.t('systemConfig.shared.accessKeyId'),
    ]

    for (const fieldLabel of s3FieldLabels) {
      expect(s3Wrapper.text()).toContain(fieldLabel)
    }
    s3Wrapper.unmount()

    const localWrapper = mount(SystemConfigForm, {
      props: {
        config: {
          ...s3Config,
          upload: {
            ...s3Config.upload,
            provider: 'local',
            endpointUrl: '',
            region: '',
            bucketName: '',
            pathPrefix: '',
            publicBaseUrl: '',
            accessKeyId: '',
            accessKeySecretMask: null,
          },
        },
        isSaving: false,
        isReadOnly: false,
        activeSection: 'upload',
      },
      global: { plugins: [i18n] },
    })

    // AI modified: changing provider removes credential controls from the user-visible form surface.
    for (const fieldLabel of s3FieldLabels) {
      expect(localWrapper.text()).not.toContain(fieldLabel)
    }
    localWrapper.unmount()
  })

  it('reveals the hidden configuration group that blocks a confirmed save', async () => {
    const config = await get<SystemConfig>('/system-config')
    const ConfirmActionStub = defineComponent({
      name: 'ConfirmAction',
      emits: ['confirm'],
      template:
        '<button type="button" data-confirm-save @click="$emit(\'confirm\')">Confirm save</button>',
    })
    const SystemConfigFormHost = defineComponent({
      components: { SystemConfigForm },
      setup() {
        return {
          activeSection: shallowRef('site'),
          invalidConfig: {
            ...config,
            upload: { ...config.upload, bucketName: '' },
          },
        }
      },
      template: `
        <SystemConfigForm
          v-model:active-section="activeSection"
          :config="invalidConfig"
          :is-saving="false"
          :is-read-only="false"
        />
        <output data-active-section>{{ activeSection }}</output>
      `,
    })
    const wrapper = mount(SystemConfigFormHost, {
      global: {
        plugins: [i18n],
        stubs: { ConfirmAction: ConfirmActionStub },
      },
    })

    await wrapper.get('[data-confirm-save]').trigger('click')
    await flushPromises()

    // AI modified: a validation failure in an unmounted tab must identify the actionable section.
    await vi.waitFor(() => expect(wrapper.get('[data-active-section]').text()).toBe('upload'))
    expect(wrapper.findComponent(SystemConfigForm).emitted('save')).toBeUndefined()
    wrapper.unmount()
  })
})
