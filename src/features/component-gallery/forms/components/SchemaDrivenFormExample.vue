<script setup lang="ts">
import type {
  SchemaDrivenField,
  SchemaDrivenSubmissionFields,
  SchemaDrivenSubmissionResponse,
  SchemaDrivenValues,
  SchemaEnvironment,
  SchemaOwnerOption,
  SchemaOwnerOptionsResponse,
  SchemaUrgency,
} from '../schema-driven-form'
import type { FileUploadEntry } from '@/components/admin'
import { computed, nextTick, reactive, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileUpload, RichTextEditor } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  SCHEMA_DRIVEN_SUBMISSION_RESPONSE_SCHEMA,
  SCHEMA_OWNER_OPTIONS_RESPONSE_SCHEMA,
} from '@/features/component-gallery/forms/schema-driven-form-api-contracts'
import { ApiError, get, isCanceledRequest, post } from '@/lib/http'
import {
  getSubmittableSchemaFields,
  getVisibleSchemaFields,
  SCHEMA_DRIVEN_EVIDENCE_MAX_BYTES,
  SCHEMA_DRIVEN_EVIDENCE_MAX_FILES,
  SCHEMA_DRIVEN_EVIDENCE_MIME_TYPES,
} from '../schema-driven-form'
import FormExampleFrame from './FormExampleFrame.vue'

type SchemaErrorName = 'approverEmail' | 'evidence' | 'requestName' | 'richBrief' | 'serviceOwner'
type ServerSchemaErrorName = Extract<SchemaErrorName, 'evidence' | 'requestName' | 'serviceOwner'>

const SERVER_SCHEMA_ERROR_NAMES: readonly ServerSchemaErrorName[] = [
  'requestName',
  'serviceOwner',
  'evidence',
]

const { locale } = useI18n()
const copy = computed(() =>
  locale.value.startsWith('zh')
    ? {
        title: 'Schema 驱动 Form：发布申请',
        description:
          '字段类型、条件、权限、必填和提交投影由同一份 Schema 驱动，并组合上传、富文本和服务端字段错误。',
        states: ['Schema', '条件字段', '字段权限', '联合提交', '服务端冲突'],
        statesLabel: 'Schema 表单状态',
        labels: {
          requestName: '申请名称',
          environment: '目标环境',
          serviceOwner: '远程服务负责人',
          approverEmail: '生产审批人',
          urgency: '紧急程度',
          requiresEvidence: '需要上传证明',
          evidence: '证明文件',
          richBrief: '发布说明',
          notes: '补充备注',
        },
        environments: { development: '开发', staging: '预发布', production: '生产' },
        urgencies: { normal: '普通', urgent: '紧急' },
        simulateReadOnly: '模拟无敏感字段写权限',
        ownerPlaceholder: '选择远程加载的负责人',
        ownerLoading: '正在加载负责人…',
        ownerError: '负责人加载失败。',
        ownerRetry: '重试加载负责人',
        evidenceDescription: '拖放 PDF、CSV、PNG 或 JPEG，或从设备选择；每个文件不超过 8 MiB。',
        browseFiles: '选择文件',
        removeFile: '移除文件',
        submit: '提交 Schema 表单',
        submitting: '提交中…',
        reset: '重置',
        errors: {
          requestName: '申请名称至少需要 3 个字符。',
          serviceOwner: '请选择当前环境的服务负责人。',
          approverEmail: '生产环境需要有效审批人邮箱。',
          evidence: '勾选证明要求后必须上传文件。',
          richBrief: '发布说明不能为空。',
          conflict: '服务端发现同名申请，请修改申请名称。',
          submit: '提交失败，请检查网络或权限后重试。',
        },
        success: (submissionId: string, fileCount: number) =>
          `字段与 ${fileCount} 个文件已原子提交，服务端回执：${submissionId}。`,
        notes:
          '离开生产环境会清理隐藏审批人；关闭证明要求会清理隐藏文件。完整工作台另有自动草稿、旧版本迁移、远程唯一性校验和离开确认。',
      }
    : {
        title: 'Schema-driven form: release request',
        description:
          'One schema owns field type, conditions, permission, required state, and submission projection while composing upload, rich text, and server field errors.',
        states: [
          'Schema',
          'Conditional fields',
          'Field permission',
          'Combined submission',
          'Server conflict',
        ],
        statesLabel: 'Schema form states',
        labels: {
          requestName: 'Request name',
          environment: 'Target environment',
          serviceOwner: 'Remotely loaded service owner',
          approverEmail: 'Production approver',
          urgency: 'Urgency',
          requiresEvidence: 'Evidence is required',
          evidence: 'Evidence files',
          richBrief: 'Release brief',
          notes: 'Additional notes',
        },
        environments: { development: 'Development', staging: 'Staging', production: 'Production' },
        urgencies: { normal: 'Normal', urgent: 'Urgent' },
        simulateReadOnly: 'Simulate no sensitive-field write access',
        ownerPlaceholder: 'Select a remotely loaded owner',
        ownerLoading: 'Loading service owners…',
        ownerError: 'Service owners could not be loaded.',
        ownerRetry: 'Retry loading service owners',
        evidenceDescription:
          'Drop PDF, CSV, PNG, or JPEG files here, or choose from your device. Each file must be 8 MiB or smaller.',
        browseFiles: 'Browse files',
        removeFile: 'Remove file',
        submit: 'Submit schema form',
        submitting: 'Submitting…',
        reset: 'Reset',
        errors: {
          requestName: 'The request name must contain at least 3 characters.',
          serviceOwner: 'Select the service owner for this environment.',
          approverEmail: 'Production requires a valid approver email.',
          evidence: 'Attach evidence after enabling the evidence requirement.',
          richBrief: 'The release brief cannot be empty.',
          conflict: 'The server found an existing request with this name. Choose another name.',
          submit: 'The submission failed. Check the network or your access and try again.',
        },
        success: (submissionId: string, fileCount: number) =>
          `Fields and files were sent as one submission contract. ${fileCount} file(s) stored; receipt: ${submissionId}.`,
        notes:
          'Leaving production clears the hidden approver; disabling evidence clears hidden files. The full workbench adds auto-draft, legacy migration, remote uniqueness, and route-leave confirmation.',
      },
)

const formElement = useTemplateRef<HTMLFormElement>('schemaForm')
const initialValues: SchemaDrivenValues = {
  requestName: 'Customer portal release',
  environment: 'staging',
  serviceOwner: '',
  approverEmail: '',
  urgency: 'normal',
  requiresEvidence: false,
  richBrief: '<p>Publish the customer portal after the accessibility gate passes.</p>',
  notes: '',
}
const values = reactive<SchemaDrivenValues>({ ...initialValues })
const evidence = ref<FileUploadEntry[]>([])
const ownerOptions = shallowRef<SchemaOwnerOption[]>([])
const ownerRequestStatus = shallowRef<'error' | 'loading' | 'ready'>('loading')
const errors = reactive<Partial<Record<SchemaErrorName, string>>>({})
const isSensitiveReadOnly = shallowRef(false)
const isSubmitting = shallowRef(false)
const isStatusError = shallowRef(false)
const statusMessage = shallowRef('')
const visibleFields = computed(() => getVisibleSchemaFields(values))

watch(
  () => values.environment,
  (environment) => {
    values.serviceOwner = ''
    ownerOptions.value = []
    delete errors.serviceOwner
    void loadOwnerOptions(environment)
    if (environment !== 'production') {
      // AI modified: hidden conditional values are removed so stale privileged data cannot be submitted invisibly.
      values.approverEmail = ''
      delete errors.approverEmail
    }
  },
  { immediate: true },
)
watch(
  () => values.requiresEvidence,
  (isRequired) => {
    if (!isRequired) {
      evidence.value = []
      delete errors.evidence
    }
  },
)
watch(isSensitiveReadOnly, (isReadOnly) => {
  if (!isReadOnly)
    return
  // AI modified: revoking sensitive-field access clears stale input before validation or submission.
  values.approverEmail = ''
  delete errors.approverEmail
})

function labelFor(field: SchemaDrivenField): string {
  return copy.value.labels[field.name]
}

function fieldId(field: SchemaDrivenField): string {
  return `schema-driven-${field.name}`
}

function errorFor(field: SchemaDrivenField): string {
  return errors[field.name as SchemaErrorName] ?? ''
}

function hasValidEmailShape(email: string): boolean {
  const segments = email.trim().split('@')
  const domain = segments[1] ?? ''
  // AI modified: bounded string checks avoid pathological email-regex backtracking in an interactive validation path.
  return (
    segments.length === 2
    && Boolean(segments[0])
    && !email.includes(' ')
    && domain.includes('.')
    && !domain.startsWith('.')
    && !domain.endsWith('.')
  )
}

function updateStringValue(
  fieldName: 'approverEmail' | 'notes' | 'requestName',
  fieldValue: string,
): void {
  values[fieldName] = fieldValue
  delete errors[fieldName as SchemaErrorName]
}

async function loadOwnerOptions(environment = values.environment): Promise<void> {
  ownerRequestStatus.value = 'loading'
  try {
    const response = await get<SchemaOwnerOptionsResponse>(
      '/component-gallery/form/service-owners',
      { environment },
      {
        requestKey: 'schema-driven-service-owners',
        responseSchema: SCHEMA_OWNER_OPTIONS_RESPONSE_SCHEMA,
      },
    )
    if (response.environment !== values.environment)
      return
    ownerOptions.value = response.options
    ownerRequestStatus.value = 'ready'
  }
  catch (error: unknown) {
    if (isCanceledRequest(error))
      return
    // AI modified: a failed remote option request remains recoverable without discarding other form input.
    ownerRequestStatus.value = 'error'
  }
}

function updateSelectValue(fieldName: 'environment' | 'urgency', fieldValue: string): void {
  if (fieldName === 'environment')
    values.environment = fieldValue as SchemaEnvironment
  else values.urgency = fieldValue as SchemaUrgency
}

function clearOwnerError(): void {
  delete errors.serviceOwner
}

function isFieldDisabled(field: SchemaDrivenField): boolean {
  return field.permission === 'sensitive-write' && isSensitiveReadOnly.value
}

function validate(): boolean {
  for (const errorName of Object.keys(errors) as SchemaErrorName[]) delete errors[errorName]
  if (values.requestName.trim().length < 3)
    errors.requestName = copy.value.errors.requestName
  if (!values.serviceOwner)
    errors.serviceOwner = copy.value.errors.serviceOwner
  if (
    values.environment === 'production'
    && !isSensitiveReadOnly.value
    && !hasValidEmailShape(values.approverEmail)
  ) {
    errors.approverEmail = copy.value.errors.approverEmail
  }
  if (values.requiresEvidence && evidence.value.length === 0)
    errors.evidence = copy.value.errors.evidence
  if (!values.richBrief.replace(/<[^>]+>/g, '').trim())
    errors.richBrief = copy.value.errors.richBrief
  return Object.keys(errors).length === 0
}

async function focusFirstError(): Promise<void> {
  await nextTick()
  const invalidField = formElement.value?.querySelector<HTMLElement>('[aria-invalid="true"]')
  if (!invalidField)
    return
  const focusTarget = invalidField.matches('button, input, select, textarea, [tabindex]')
    ? invalidField
    : invalidField.querySelector<HTMLElement>('button, input, select, textarea, [tabindex]')
  focusTarget?.focus()
}

function getServerFieldErrors(error: unknown): Partial<Record<ServerSchemaErrorName, string>> {
  if (!(error instanceof ApiError) || typeof error.details !== 'object' || error.details === null) {
    return {}
  }
  const fieldErrors = Reflect.get(error.details, 'fieldErrors')
  if (typeof fieldErrors !== 'object' || fieldErrors === null)
    return {}

  const serverErrors: Partial<Record<ServerSchemaErrorName, string>> = {}
  for (const errorName of SERVER_SCHEMA_ERROR_NAMES) {
    const message = Reflect.get(fieldErrors, errorName)
    if (typeof message === 'string' && message.trim())
      serverErrors[errorName] = message.trim()
  }
  return serverErrors
}

async function submit(): Promise<void> {
  statusMessage.value = ''
  isStatusError.value = false
  if (!validate()) {
    await focusFirstError()
    return
  }
  isSubmitting.value = true
  try {
    const submissionFields = getSubmittableSchemaFields(values, {
      canWriteSensitiveFields: !isSensitiveReadOnly.value,
    })
    const submission: SchemaDrivenSubmissionFields = {
      requestName: values.requestName,
      environment: values.environment,
      serviceOwner: values.serviceOwner,
      urgency: values.urgency,
      requiresEvidence: values.requiresEvidence,
      richBrief: values.richBrief,
      notes: values.notes,
      ...(submissionFields.some(field => field.name === 'approverEmail')
        ? { approverEmail: values.approverEmail }
        : {}),
    }
    const submissionBody = new FormData()
    submissionBody.append(
      'submission',
      new Blob([JSON.stringify(submission)], { type: 'application/json' }),
      'submission.json',
    )
    for (const entry of evidence.value) {
      submissionBody.append('evidence', entry.file, entry.file.name)
    }

    // AI modified: success now requires one server transaction containing the projected fields and real File bytes.
    const savedSubmission = await post<SchemaDrivenSubmissionResponse>(
      '/component-gallery/form/submissions',
      submissionBody,
      { responseSchema: SCHEMA_DRIVEN_SUBMISSION_RESPONSE_SCHEMA },
    )
    statusMessage.value = copy.value.success(
      savedSubmission.submissionId,
      savedSubmission.evidence.length,
    )
  }
  catch (error: unknown) {
    if (error instanceof ApiError && error.code === 'SCHEMA_SUBMISSION_CONFLICT') {
      // AI modified: write-time conflicts return to the originating field before focus recovery.
      errors.requestName = copy.value.errors.conflict
      await focusFirstError()
      return
    }
    const serverFieldErrors = getServerFieldErrors(error)
    if (Object.keys(serverFieldErrors).length > 0) {
      // AI modified: only known server fields can enter the reactive error map or control focus.
      Object.assign(errors, serverFieldErrors)
      await focusFirstError()
      return
    }
    isStatusError.value = true
    statusMessage.value = error instanceof ApiError ? error.message : copy.value.errors.submit
  }
  finally {
    isSubmitting.value = false
  }
}

function reset(): void {
  Object.assign(values, initialValues)
  evidence.value = []
  for (const errorName of Object.keys(errors) as SchemaErrorName[]) delete errors[errorName]
  isStatusError.value = false
  statusMessage.value = ''
}
</script>

<template>
  <FormExampleFrame
    id="schema-driven-form-example"
    sequence="06 · SCHEMA"
    :title="copy.title"
    :description="copy.description"
    :states="copy.states"
    :states-label="copy.statesLabel"
  >
    <div class="mb-4 flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
      <Switch id="schema-sensitive-access" v-model="isSensitiveReadOnly" />
      <Label for="schema-sensitive-access" class="min-w-0 break-words">{{
        copy.simulateReadOnly
      }}</Label>
    </div>

    <form
      ref="schemaForm"
      class="grid min-w-0 gap-4 lg:grid-cols-2"
      novalidate
      :aria-busy="isSubmitting"
      @submit.prevent="submit"
    >
      <div
        v-for="field in visibleFields"
        :key="field.name"
        class="min-w-0 space-y-2"
        :class="['textarea', 'file', 'rich-text'].includes(field.kind) ? 'lg:col-span-2' : ''"
        :data-schema-field="field.name"
      >
        <template v-if="field.kind === 'text' || field.kind === 'email'">
          <Label :for="fieldId(field)">{{ labelFor(field) }}</Label>
          <Input
            :id="fieldId(field)"
            :type="field.kind"
            :model-value="values[field.name]"
            :disabled="isFieldDisabled(field)"
            :aria-invalid="Boolean(errorFor(field))"
            :aria-describedby="`${fieldId(field)}-error`"
            @update:model-value="updateStringValue(field.name, String($event))"
          />
          <p :id="`${fieldId(field)}-error`" class="min-h-5 text-xs text-destructive" role="alert">
            {{ errorFor(field) }}
          </p>
        </template>

        <template v-else-if="field.kind === 'textarea'">
          <Label :for="fieldId(field)">{{ labelFor(field) }}</Label>
          <Textarea
            :id="fieldId(field)"
            :model-value="values[field.name]"
            @update:model-value="updateStringValue(field.name, String($event))"
          />
        </template>

        <template v-else-if="field.kind === 'select'">
          <Label :for="fieldId(field)">{{ labelFor(field) }}</Label>
          <select
            :id="fieldId(field)"
            :value="values[field.name]"
            class="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm"
            @change="updateSelectValue(field.name, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="option in field.options" :key="option" :value="option">
              {{
                field.name === 'environment'
                  ? copy.environments[option as SchemaEnvironment]
                  : copy.urgencies[option as SchemaUrgency]
              }}
            </option>
          </select>
        </template>

        <template v-else-if="field.kind === 'remote-select'">
          <Label :for="fieldId(field)">{{ labelFor(field) }}</Label>
          <select
            :id="fieldId(field)"
            v-model="values.serviceOwner"
            class="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm"
            :disabled="ownerRequestStatus !== 'ready'"
            :aria-busy="ownerRequestStatus === 'loading'"
            :aria-invalid="Boolean(errors.serviceOwner)"
            :aria-describedby="`${fieldId(field)}-status ${fieldId(field)}-error`"
            @change="clearOwnerError"
          >
            <option value="">
              {{ copy.ownerPlaceholder }}
            </option>
            <option v-for="option in ownerOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <p
            :id="`${fieldId(field)}-status`"
            class="min-h-5 text-xs text-muted-foreground"
            aria-live="polite"
          >
            <span v-if="ownerRequestStatus === 'loading'">{{ copy.ownerLoading }}</span>
            <span
              v-else-if="ownerRequestStatus === 'error'"
              class="inline-flex flex-wrap items-center gap-2 text-destructive"
            >
              {{ copy.ownerError }}
              <Button type="button" size="sm" variant="outline" @click="loadOwnerOptions()">{{
                copy.ownerRetry
              }}</Button>
            </span>
          </p>
          <p :id="`${fieldId(field)}-error`" class="min-h-5 text-xs text-destructive" role="alert">
            {{ errors.serviceOwner }}
          </p>
        </template>

        <template v-else-if="field.kind === 'switch'">
          <div class="flex items-center gap-3">
            <Switch :id="fieldId(field)" v-model="values.requiresEvidence" />
            <Label :for="fieldId(field)" class="min-w-0 break-words">{{ labelFor(field) }}</Label>
          </div>
        </template>

        <template v-else-if="field.kind === 'file'">
          <!-- AI modified: localized input hints and the browser accept filter match the enforced file policy. -->
          <FileUpload
            v-model="evidence"
            accept=".pdf,.csv,.png,.jpg,.jpeg"
            :allowed-extensions="['.pdf', '.csv', '.png', '.jpg', '.jpeg']"
            :allowed-mime-types="SCHEMA_DRIVEN_EVIDENCE_MIME_TYPES"
            :max-files="SCHEMA_DRIVEN_EVIDENCE_MAX_FILES"
            :max-size="SCHEMA_DRIVEN_EVIDENCE_MAX_BYTES"
            :label="labelFor(field)"
            :description="copy.evidenceDescription"
            :browse-label="copy.browseFiles"
            :remove-label="copy.removeFile"
            :aria-invalid="Boolean(errors.evidence)"
          />
          <p class="min-h-5 text-xs text-destructive" role="alert">
            {{ errors.evidence }}
          </p>
        </template>

        <template v-else>
          <!-- AI modified: RichTextEditor provides its own group name; this copy is a visual heading. -->
          <p class="text-sm font-medium">
            {{ labelFor(field) }}
          </p>
          <RichTextEditor
            v-model="values.richBrief"
            :label="labelFor(field)"
            :error="errors.richBrief"
          />
        </template>
      </div>

      <div class="flex flex-wrap justify-end gap-2 lg:col-span-2">
        <Button type="button" variant="outline" @click="reset">
          {{ copy.reset }}
        </Button>
        <Button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? copy.submitting : copy.submit }}
        </Button>
      </div>
      <p
        class="min-h-5 text-sm lg:col-span-2"
        :class="isStatusError ? 'text-destructive' : ''"
        data-testid="schema-form-status"
        aria-live="assertive"
      >
        {{ statusMessage }}
      </p>
    </form>

    <template #notes>
      {{ copy.notes }}
    </template>
  </FormExampleFrame>
</template>
