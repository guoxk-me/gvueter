<script setup lang="ts">
import type { WorkflowStep } from '@/components/admin'
import { computed, nextTick, reactive, shallowRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { WorkflowStepper } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import FormExampleFrame from './FormExampleFrame.vue'

interface RolloutPlan {
  name: string
  owner: string
  classification: 'internal' | 'restricted' | 'public'
  changeWindow: string
  runbook: string
}

type RolloutErrors = Partial<Record<keyof RolloutPlan, string>>

const { locale } = useI18n()
const copy = computed(() =>
  locale.value.startsWith('zh')
    ? {
        title: '分步 Form：发布计划',
        description: '每一步只校验当前责任，最后提供完整复核，并允许返回修改而不丢失输入。',
        states: ['当前步骤', '步骤阻断', '复核', '已完成'],
        statesLabel: '分步表单支持的状态',
        steps: [
          { id: 'identity', title: '发布身份', description: '名称与负责人' },
          { id: 'controls', title: '发布控制', description: '级别、窗口与回滚' },
          { id: 'review', title: '复核提交', description: '确认完整计划' },
        ],
        name: '发布名称',
        owner: '发布负责人邮箱',
        classification: '数据级别',
        classifications: { internal: '内部', restricted: '受限', public: '公开' },
        changeWindow: '变更窗口',
        runbook: '回滚说明',
        nameError: '请输入发布名称。',
        ownerError: '请输入有效的负责人邮箱。',
        windowError: '请选择变更窗口。',
        runbookError: '回滚说明至少需要 12 个字符。',
        blocked: '当前步骤仍有需要修正的字段。',
        previous: '上一步',
        next: '校验并继续',
        submit: '提交发布计划',
        reviewTitle: '发布计划复核',
        labels: {
          name: '名称',
          owner: '负责人',
          classification: '数据级别',
          changeWindow: '变更窗口',
          runbook: '回滚说明',
        },
        success: '发布计划已提交，示例输入仍保留以便复核。',
        notes:
          '步骤按钮只表达进度，不允许绕过校验直接跳转。返回上一步时使用保留在 DOM 中的受控输入，避免状态丢失。',
      }
    : {
        title: 'Stepped form: rollout plan',
        description:
          'Each step validates its current responsibility, followed by a complete review that preserves edits when moving back.',
        states: ['Current step', 'Blocked step', 'Review', 'Completed'],
        statesLabel: 'Supported stepped form states',
        steps: [
          { id: 'identity', title: 'Rollout identity', description: 'Name and owner' },
          { id: 'controls', title: 'Rollout controls', description: 'Class, window, and rollback' },
          { id: 'review', title: 'Review and submit', description: 'Confirm the complete plan' },
        ],
        name: 'Rollout name',
        owner: 'Rollout owner email',
        classification: 'Data classification',
        classifications: { internal: 'Internal', restricted: 'Restricted', public: 'Public' },
        changeWindow: 'Change window',
        runbook: 'Rollback instructions',
        nameError: 'Enter the rollout name.',
        ownerError: 'Enter a valid owner email.',
        windowError: 'Choose a change window.',
        runbookError: 'Rollback instructions must contain at least 12 characters.',
        blocked: 'The current step still has fields to correct.',
        previous: 'Previous step',
        next: 'Validate and continue',
        submit: 'Submit rollout plan',
        reviewTitle: 'Rollout plan review',
        labels: {
          name: 'Name',
          owner: 'Owner',
          classification: 'Data class',
          changeWindow: 'Change window',
          runbook: 'Rollback instructions',
        },
        success: 'The rollout plan was submitted. Example inputs remain available for review.',
        notes:
          'Step controls communicate progress but cannot bypass validation. Controlled inputs remain in the DOM so moving backward never discards work.',
      },
)

const formElement = useTemplateRef<HTMLFormElement>('steppedForm')
const currentStep = shallowRef(0)
const plan = reactive<RolloutPlan>({
  name: '',
  owner: '',
  classification: 'restricted',
  changeWindow: '',
  runbook: '',
})
const errors = reactive<RolloutErrors>({})
const statusMessage = shallowRef('')
const steps = computed<WorkflowStep[]>(() => copy.value.steps)

function clearStepErrors(fieldNames: readonly (keyof RolloutPlan)[]): void {
  for (const fieldName of fieldNames) delete errors[fieldName]
}

function validateCurrentStep(): boolean {
  statusMessage.value = ''
  if (currentStep.value === 0) {
    clearStepErrors(['name', 'owner'])
    if (!plan.name.trim()) errors.name = copy.value.nameError
    if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(plan.owner.trim()))
      errors.owner = copy.value.ownerError
    return !errors.name && !errors.owner
  }

  if (currentStep.value === 1) {
    clearStepErrors(['changeWindow', 'runbook'])
    if (!plan.changeWindow) errors.changeWindow = copy.value.windowError
    if (plan.runbook.trim().length < 12) errors.runbook = copy.value.runbookError
    return !errors.changeWindow && !errors.runbook
  }
  return true
}

async function focusFirstError(): Promise<void> {
  await nextTick()
  formElement.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

async function goToNextStep(): Promise<void> {
  if (!validateCurrentStep()) {
    statusMessage.value = copy.value.blocked
    await focusFirstError()
    return
  }
  // AI modified: step advancement is gated by the fields owned by the visible workflow stage.
  currentStep.value = Math.min(currentStep.value + 1, steps.value.length - 1)
}

function goToPreviousStep(): void {
  statusMessage.value = ''
  currentStep.value = Math.max(currentStep.value - 1, 0)
}

function submitPlan(): void {
  statusMessage.value = copy.value.success
}
</script>

<template>
  <FormExampleFrame
    id="stepped-form-example"
    sequence="04 · STEPPED"
    :title="copy.title"
    :description="copy.description"
    :states="copy.states"
    :states-label="copy.statesLabel"
  >
    <div class="rounded-lg border border-border bg-muted/15 p-4">
      <WorkflowStepper v-model="currentStep" :steps="steps" />
    </div>

    <form
      ref="steppedForm"
      class="space-y-5"
      novalidate
      aria-labelledby="stepped-form-example-title"
      @submit.prevent="submitPlan"
    >
      <section
        v-show="currentStep === 0"
        class="grid gap-4 lg:grid-cols-2"
        :aria-hidden="currentStep !== 0"
      >
        <div class="space-y-2">
          <Label for="stepped-rollout-name">{{ copy.name }}</Label>
          <Input
            id="stepped-rollout-name"
            v-model="plan.name"
            :aria-invalid="Boolean(errors.name)"
            aria-describedby="stepped-rollout-name-error"
          />
          <p id="stepped-rollout-name-error" class="min-h-5 text-xs text-destructive" role="alert">
            {{ errors.name }}
          </p>
        </div>
        <div class="space-y-2">
          <Label for="stepped-rollout-owner">{{ copy.owner }}</Label>
          <Input
            id="stepped-rollout-owner"
            v-model="plan.owner"
            type="email"
            autocomplete="email"
            :aria-invalid="Boolean(errors.owner)"
            aria-describedby="stepped-rollout-owner-error"
          />
          <p id="stepped-rollout-owner-error" class="min-h-5 text-xs text-destructive" role="alert">
            {{ errors.owner }}
          </p>
        </div>
      </section>

      <section
        v-show="currentStep === 1"
        class="grid gap-4 lg:grid-cols-2"
        :aria-hidden="currentStep !== 1"
      >
        <div class="space-y-2">
          <Label for="stepped-rollout-classification">{{ copy.classification }}</Label>
          <select
            id="stepped-rollout-classification"
            v-model="plan.classification"
            class="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="internal">
              {{ copy.classifications.internal }}
            </option>
            <option value="restricted">
              {{ copy.classifications.restricted }}
            </option>
            <option value="public">
              {{ copy.classifications.public }}
            </option>
          </select>
        </div>
        <div class="space-y-2">
          <Label for="stepped-rollout-window">{{ copy.changeWindow }}</Label>
          <Input
            id="stepped-rollout-window"
            v-model="plan.changeWindow"
            type="datetime-local"
            :aria-invalid="Boolean(errors.changeWindow)"
            aria-describedby="stepped-rollout-window-error"
          />
          <p
            id="stepped-rollout-window-error"
            class="min-h-5 text-xs text-destructive"
            role="alert"
          >
            {{ errors.changeWindow }}
          </p>
        </div>
        <div class="space-y-2 lg:col-span-2">
          <Label for="stepped-rollout-runbook">{{ copy.runbook }}</Label>
          <Textarea
            id="stepped-rollout-runbook"
            v-model="plan.runbook"
            :aria-invalid="Boolean(errors.runbook)"
            aria-describedby="stepped-rollout-runbook-error"
          />
          <p
            id="stepped-rollout-runbook-error"
            class="min-h-5 text-xs text-destructive"
            role="alert"
          >
            {{ errors.runbook }}
          </p>
        </div>
      </section>

      <section
        v-show="currentStep === 2"
        :aria-hidden="currentStep !== 2"
        aria-labelledby="stepped-review-title"
      >
        <h3 id="stepped-review-title" class="mb-3 text-sm font-semibold">
          {{ copy.reviewTitle }}
        </h3>
        <dl
          class="grid gap-x-6 gap-y-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-[minmax(8rem,0.35fr)_minmax(0,1fr)]"
        >
          <template
            v-for="field in ['name', 'owner', 'classification', 'changeWindow', 'runbook'] as const"
            :key="field"
          >
            <dt class="text-xs font-medium text-muted-foreground">
              {{ copy.labels[field] }}
            </dt>
            <dd class="min-w-0 break-words text-sm">
              {{ plan[field] }}
            </dd>
          </template>
        </dl>
      </section>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          :disabled="currentStep === 0"
          @click="goToPreviousStep"
        >
          {{ copy.previous }}
        </Button>
        <Button v-if="currentStep < steps.length - 1" type="button" @click="goToNextStep">
          {{ copy.next }}
        </Button>
        <Button v-else type="submit">
          {{ copy.submit }}
        </Button>
      </div>
      <p data-testid="stepped-form-status" class="min-h-5 text-sm" aria-live="assertive">
        {{ statusMessage }}
      </p>
    </form>

    <template #notes>
      {{ copy.notes }}
    </template>
  </FormExampleFrame>
</template>
