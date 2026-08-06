<script setup lang="ts">
import { computed, nextTick, reactive, shallowRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import FormExampleFrame from './FormExampleFrame.vue'

interface ValidationValues {
  email: string
  costCenter: string
  reason: string
}

type ValidationErrors = Partial<Record<keyof ValidationValues, string>>

const { locale } = useI18n()
const copy = computed(() =>
  locale.value.startsWith('zh')
    ? {
        title: '校验 Form：临时访问申请',
        description: '同时展示失焦校验、提交校验、字段级服务端冲突和首个错误聚焦。',
        states: ['未校验', '字段错误', '服务端冲突', '已通过'],
        statesLabel: '校验表单支持的状态',
        email: '申请人邮箱',
        emailHint: '使用工作邮箱；reserved.example 用于演示服务端冲突。',
        costCenter: '成本中心',
        costCenterHint: '格式：三个大写字母、连字符和四位数字，例如 OPS-2048。',
        reason: '访问理由',
        reasonHint: '至少 20 个字符，说明所需系统和完成时间。',
        submit: '校验并申请',
        submitting: '正在校验…',
        errors: {
          emailRequired: '请输入申请人邮箱。',
          emailInvalid: '请输入有效的工作邮箱。',
          emailConflict: '该邮箱已有待处理的访问申请。请先查看现有申请。',
          costCenter: '成本中心必须符合 OPS-2048 格式。',
          reason: '访问理由至少需要 20 个字符。',
        },
        invalidSummary: '请修正标记的字段后再次提交。',
        success: '访问申请已通过客户端与服务端校验。',
        notes:
          '错误文本通过 aria-describedby 与字段关联；提交失败后焦点移动到第一个无效字段，服务端冲突保留在原字段上下文中。',
      }
    : {
        title: 'Validation form: temporary access',
        description:
          'Blur validation, submit validation, field-level server conflict, and first-error focus work together.',
        states: ['Untouched', 'Field error', 'Server conflict', 'Valid'],
        statesLabel: 'Supported validation form states',
        email: 'Requester email',
        emailHint: 'Use a work email; reserved.example demonstrates a server-side conflict.',
        costCenter: 'Cost center',
        costCenterHint: 'Use three uppercase letters, a dash, and four digits, such as OPS-2048.',
        reason: 'Access reason',
        reasonHint: 'Use at least 20 characters and name the system and completion date.',
        submit: 'Validate and request',
        submitting: 'Validating…',
        errors: {
          emailRequired: 'Enter the requester email.',
          emailInvalid: 'Enter a valid work email.',
          emailConflict:
            'This email already has a pending access request. Review the existing request first.',
          costCenter: 'Use the cost-center pattern OPS-2048.',
          reason: 'The access reason must contain at least 20 characters.',
        },
        invalidSummary: 'Correct the marked fields and submit again.',
        success: 'The access request passed client and server validation.',
        notes:
          'aria-describedby links errors to their fields. Failed submission focuses the first invalid field, and server conflicts stay in the original field context.',
      },
)

const validationForm = useTemplateRef<HTMLFormElement>('validationForm')
const values = reactive<ValidationValues>({
  email: '',
  costCenter: '',
  reason: '',
})
const errors = reactive<ValidationErrors>({})
const statusMessage = shallowRef('')
const isSubmitting = shallowRef(false)

function validateEmail(): boolean {
  const email = values.email.trim()
  if (!email) {
    errors.email = copy.value.errors.emailRequired
    return false
  }
  if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(email)) {
    errors.email = copy.value.errors.emailInvalid
    return false
  }
  delete errors.email
  return true
}

function validateCostCenter(): boolean {
  if (!/^[A-Z]{3}-\d{4}$/.test(values.costCenter.trim())) {
    errors.costCenter = copy.value.errors.costCenter
    return false
  }
  delete errors.costCenter
  return true
}

function validateReason(): boolean {
  if (values.reason.trim().length < 20) {
    errors.reason = copy.value.errors.reason
    return false
  }
  delete errors.reason
  return true
}

async function focusFirstError(): Promise<void> {
  await nextTick()
  validationForm.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

async function submitRequest(): Promise<void> {
  statusMessage.value = ''
  const isValid = [validateEmail(), validateCostCenter(), validateReason()].every(Boolean)
  if (!isValid) {
    statusMessage.value = copy.value.invalidSummary
    await focusFirstError()
    return
  }

  isSubmitting.value = true
  try {
    // AI modified: a deterministic reserved domain demonstrates how API field errors re-enter the same accessible contract.
    await Promise.resolve()
    if (values.email.toLowerCase().endsWith('@reserved.example')) {
      errors.email = copy.value.errors.emailConflict
      statusMessage.value = copy.value.invalidSummary
      await focusFirstError()
      return
    }
    statusMessage.value = copy.value.success
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <FormExampleFrame
    id="validation-form-example"
    sequence="02 · VALIDATION"
    :title="copy.title"
    :description="copy.description"
    :states="copy.states"
    :states-label="copy.statesLabel"
  >
    <form
      ref="validationForm"
      class="grid gap-5 lg:grid-cols-2"
      novalidate
      :aria-busy="isSubmitting"
      aria-labelledby="validation-form-example-title"
      @submit.prevent="submitRequest"
    >
      <div class="space-y-2">
        <Label for="validation-request-email">{{ copy.email }}</Label>
        <Input
          id="validation-request-email"
          v-model="values.email"
          type="email"
          autocomplete="email"
          :aria-invalid="Boolean(errors.email)"
          aria-describedby="validation-request-email-hint validation-request-email-error"
          @blur="validateEmail"
        />
        <p id="validation-request-email-hint" class="text-xs text-muted-foreground">
          {{ copy.emailHint }}
        </p>
        <p
          id="validation-request-email-error"
          class="min-h-5 text-xs text-destructive"
          role="alert"
        >
          {{ errors.email }}
        </p>
      </div>
      <div class="space-y-2">
        <Label for="validation-cost-center">{{ copy.costCenter }}</Label>
        <Input
          id="validation-cost-center"
          v-model="values.costCenter"
          autocomplete="off"
          :aria-invalid="Boolean(errors.costCenter)"
          aria-describedby="validation-cost-center-hint validation-cost-center-error"
          @blur="validateCostCenter"
        />
        <p id="validation-cost-center-hint" class="text-xs text-muted-foreground">
          {{ copy.costCenterHint }}
        </p>
        <p id="validation-cost-center-error" class="min-h-5 text-xs text-destructive" role="alert">
          {{ errors.costCenter }}
        </p>
      </div>
      <div class="space-y-2 lg:col-span-2">
        <Label for="validation-access-reason">{{ copy.reason }}</Label>
        <Textarea
          id="validation-access-reason"
          v-model="values.reason"
          :aria-invalid="Boolean(errors.reason)"
          aria-describedby="validation-access-reason-hint validation-access-reason-error"
          @blur="validateReason"
        />
        <p id="validation-access-reason-hint" class="text-xs text-muted-foreground">
          {{ copy.reasonHint }}
        </p>
        <p
          id="validation-access-reason-error"
          class="min-h-5 text-xs text-destructive"
          role="alert"
        >
          {{ errors.reason }}
        </p>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
        <p
          data-testid="validation-form-status"
          class="min-h-5 min-w-0 flex-1 text-sm"
          aria-live="assertive"
        >
          {{ statusMessage }}
        </p>
        <Button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? copy.submitting : copy.submit }}
        </Button>
      </div>
    </form>

    <template #notes>
      {{ copy.notes }}
    </template>
  </FormExampleFrame>
</template>
