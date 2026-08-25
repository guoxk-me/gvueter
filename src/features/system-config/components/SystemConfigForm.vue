<script setup lang="ts">
import type {
  SystemConfig,
  SystemConfigInput,
  SystemConfigSection,
} from '@/features/system-config/types'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { z } from 'zod'
import { ConfirmAction } from '@/components/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SMS_PROVIDERS, UPLOAD_PROVIDERS } from '@/features/system-config/types'
import EmailConfigSection from './EmailConfigSection.vue'
import SiteConfigSection from './SiteConfigSection.vue'
import SmsConfigSection from './SmsConfigSection.vue'
import ThirdPartyConfigSection from './ThirdPartyConfigSection.vue'
import UploadConfigSection from './UploadConfigSection.vue'

const props = defineProps<{
  config: SystemConfig
  isSaving: boolean
  isReadOnly: boolean
}>()

const emit = defineEmits<{
  save: [input: SystemConfigInput]
}>()

const { t } = useI18n()
const activeSection = defineModel<SystemConfigSection>('activeSection', { default: 'site' })
const isConfirmationOpen = shallowRef(false)
function isSafeHttpUrl(urlText: string): boolean {
  try {
    // AI modified: the form emits only canonical absolute HTTP(S) URLs accepted by the API.
    if (!/^https?:\/\//.test(urlText))
      return false
    const url = new URL(urlText)
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
  }
  catch {
    return false
  }
}

const requiredUrl = computed(() =>
  z
    .string()
    .trim()
    .url(t('systemConfig.validation.url'))
    .refine(isSafeHttpUrl, t('systemConfig.validation.url')),
)
const optionalUrl = computed(() => z.union([z.literal(''), requiredUrl.value]))
const formSchema = computed(() =>
  toTypedSchema(
    z.object({
      site: z.object({
        siteName: z.string().trim().min(1, t('systemConfig.validation.required')),
        publicUrl: requiredUrl.value,
        supportEmail: z.string().trim().email(t('systemConfig.validation.email')),
        isMaintenanceMode: z.boolean(),
      }),
      upload: z
        .object({
          provider: z.enum(UPLOAD_PROVIDERS),
          maxFileSizeMb: z.coerce.number().int().min(1).max(200),
          allowedExtensions: z
            .string()
            .min(1, t('systemConfig.validation.required'))
            .max(2_000)
            .regex(/^[a-z0-9]+(?:,[a-z0-9]+)*$/i, t('systemConfig.validation.extensions')),
          endpointUrl: optionalUrl.value,
          region: z
            .string()
            .trim()
            .max(100)
            .refine(
              region => !region || /^[a-z0-9][a-z0-9-]{0,99}$/.test(region),
              t('systemConfig.validation.region'),
            ),
          bucketName: z
            .string()
            .trim()
            .max(63)
            .refine((bucketName) => {
              if (!bucketName)
                return true
              return (
                bucketName.length >= 3
                && /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(bucketName)
                && !bucketName.includes('..')
                && !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(bucketName)
              )
            }, t('systemConfig.validation.bucketName')),
          pathPrefix: z
            .string()
            .trim()
            .max(500)
            .refine(
              pathPrefix =>
                !pathPrefix || /^(?:[a-z0-9][\w.-]*\/)*[a-z0-9][\w.-]*$/i.test(pathPrefix),
              t('systemConfig.validation.pathPrefix'),
            ),
          isPathStyle: z.boolean(),
          publicBaseUrl: optionalUrl.value,
          accessKeyId: z.string().trim().max(500),
          accessKeySecret: z.string().max(4_096),
        })
        .superRefine((upload, context) => {
          if (upload.provider !== 's3')
            return

          // AI modified: S3-only fields stay optional for local storage but must close the S3 contract.
          for (const field of ['endpointUrl', 'region', 'bucketName', 'accessKeyId'] as const) {
            if (!upload[field]) {
              context.addIssue({
                code: 'custom',
                path: [field],
                message: t('systemConfig.validation.required'),
              })
            }
          }
          if (!props.config.upload.accessKeySecretMask && !upload.accessKeySecret.trim()) {
            context.addIssue({
              code: 'custom',
              path: ['accessKeySecret'],
              message: t('systemConfig.validation.s3Secret'),
            })
          }
        }),
      sms: z.object({
        provider: z.enum(SMS_PROVIDERS),
        senderName: z.string().trim(),
        accessKeyId: z.string().trim(),
        accessKeySecret: z.string(),
      }),
      email: z.object({
        host: z.string().trim().min(1, t('systemConfig.validation.required')),
        port: z.coerce.number().int().min(1).max(65535),
        isSecure: z.boolean(),
        username: z.string().trim().min(1, t('systemConfig.validation.required')),
        password: z.string(),
        fromName: z.string().trim().min(1, t('systemConfig.validation.required')),
        fromAddress: z.string().trim().email(t('systemConfig.validation.email')),
      }),
      thirdParty: z.object({
        isSsoEnabled: z.boolean(),
        oauthClientId: z.string().trim(),
        oauthClientSecret: z.string(),
        webhookUrl: optionalUrl.value,
        webhookSigningSecret: z.string(),
      }),
    }),
  ),
)
const { handleSubmit, resetForm, values } = useForm<SystemConfigInput>({
  validationSchema: formSchema,
  // AI modified: switching to local storage hides S3 controls without deleting retained backend fields.
  keepValuesOnUnmount: true,
})

watch(
  () => props.config,
  (config) => {
    // AI modified: server-owned values reset the draft while secret inputs always start empty.
    resetForm({
      values: {
        site: { ...config.site },
        upload: {
          provider: config.upload.provider,
          maxFileSizeMb: config.upload.maxFileSizeMb,
          allowedExtensions: config.upload.allowedExtensions,
          endpointUrl: config.upload.endpointUrl,
          region: config.upload.region,
          bucketName: config.upload.bucketName,
          pathPrefix: config.upload.pathPrefix,
          isPathStyle: config.upload.isPathStyle,
          publicBaseUrl: config.upload.publicBaseUrl,
          accessKeyId: config.upload.accessKeyId,
          accessKeySecret: '',
        },
        sms: {
          provider: config.sms.provider,
          senderName: config.sms.senderName,
          accessKeyId: config.sms.accessKeyId,
          accessKeySecret: '',
        },
        email: {
          host: config.email.host,
          port: config.email.port,
          isSecure: config.email.isSecure,
          username: config.email.username,
          password: '',
          fromName: config.email.fromName,
          fromAddress: config.email.fromAddress,
        },
        thirdParty: {
          isSsoEnabled: config.thirdParty.isSsoEnabled,
          oauthClientId: config.thirdParty.oauthClientId,
          oauthClientSecret: '',
          webhookUrl: config.thirdParty.webhookUrl,
          webhookSigningSecret: '',
        },
      },
    })
  },
  { immediate: true },
)

const submitConfig = handleSubmit(
  (input) => {
    isConfirmationOpen.value = false
    emit('save', input)
  },
  ({ errors }) => {
    isConfirmationOpen.value = false

    const firstInvalidGroup = Object.keys(errors)[0]?.split('.')[0]
    // AI modified: reveal the hidden configuration group that prevented the confirmed save.
    if (firstInvalidGroup === 'site')
      activeSection.value = 'site'
    else if (firstInvalidGroup === 'upload')
      activeSection.value = 'upload'
    else if (firstInvalidGroup === 'sms')
      activeSection.value = 'sms'
    else if (firstInvalidGroup === 'email')
      activeSection.value = 'email'
    else if (firstInvalidGroup === 'thirdParty')
      activeSection.value = 'third-party'
  },
)
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t('systemConfig.formTitle') }}</CardTitle>
      <CardDescription>{{ t('systemConfig.formDescription') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <form class="space-y-6" @submit.prevent>
        <!-- AI modified: controlled configuration sections keep URL history and visible form state aligned. -->
        <Tabs v-model="activeSection" class="space-y-6">
          <TabsList class="h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="site">
              {{ t('systemConfig.groups.site') }}
            </TabsTrigger>
            <TabsTrigger value="upload">
              {{ t('systemConfig.groups.upload') }}
            </TabsTrigger>
            <TabsTrigger value="sms">
              {{ t('systemConfig.groups.sms') }}
            </TabsTrigger>
            <TabsTrigger value="email">
              {{ t('systemConfig.groups.email') }}
            </TabsTrigger>
            <TabsTrigger value="third-party">
              {{ t('systemConfig.groups.thirdParty') }}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="site">
            <SiteConfigSection :is-disabled="isSaving || isReadOnly" />
          </TabsContent>
          <TabsContent value="upload">
            <UploadConfigSection
              :is-disabled="isSaving || isReadOnly"
              :provider="values.upload.provider"
              :secret-mask="config.upload.accessKeySecretMask"
            />
          </TabsContent>
          <TabsContent value="sms">
            <SmsConfigSection
              :is-disabled="isSaving || isReadOnly"
              :secret-mask="config.sms.accessKeySecretMask"
            />
          </TabsContent>
          <TabsContent value="email">
            <EmailConfigSection
              :is-disabled="isSaving || isReadOnly"
              :secret-mask="config.email.passwordMask"
            />
          </TabsContent>
          <TabsContent value="third-party">
            <ThirdPartyConfigSection
              :is-disabled="isSaving || isReadOnly"
              :oauth-secret-mask="config.thirdParty.oauthClientSecretMask"
              :webhook-secret-mask="config.thirdParty.webhookSigningSecretMask"
            />
          </TabsContent>
        </Tabs>

        <div v-if="!isReadOnly" class="flex justify-end border-t pt-5">
          <ConfirmAction
            v-model:open="isConfirmationOpen"
            :title="t('systemConfig.confirmTitle')"
            :description="t('systemConfig.confirmDescription')"
            :trigger-label="t('systemConfig.save')"
            :confirm-label="t('systemConfig.confirmSave')"
            :pending-label="t('common.saving')"
            :is-pending="isSaving"
            :close-on-confirm="false"
            @confirm="submitConfig"
          />
        </div>
      </form>
    </CardContent>
  </Card>
</template>
