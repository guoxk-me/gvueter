<script setup lang="ts">
import type { ActivityTimelineEntry, WorkflowStep } from '@/components/admin'
import { CheckCircle2, FileCheck2, Send } from '@lucide/vue'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ActivityTimeline, CopyButton, WorkflowStepper } from '@/components/admin'
import { Button } from '@/components/ui/button'
import ComponentDemoCard from './ComponentDemoCard.vue'

const { t } = useI18n()
const currentStep = shallowRef(1)
const invitationCode = 'adm-invite-6E92-F6A8'

const workflowSteps = computed<readonly WorkflowStep[]>(() => [
  {
    id: 'draft',
    title: t('components.workflow.steps.draft'),
    description: t('components.workflow.steps.draftDescription'),
  },
  {
    id: 'review',
    title: t('components.workflow.steps.review'),
    description: t('components.workflow.steps.reviewDescription'),
  },
  {
    id: 'publish',
    title: t('components.workflow.steps.publish'),
    description: t('components.workflow.steps.publishDescription'),
  },
])

const auditEntries = computed<readonly ActivityTimelineEntry[]>(() => [
  {
    id: 'audit-1',
    title: t('components.workflow.audit.created'),
    description: t('components.workflow.audit.createdDescription'),
    occurredAt: t('components.workflow.audit.justNow'),
    icon: FileCheck2,
    tone: 'info',
  },
  {
    id: 'audit-2',
    title: t('components.workflow.audit.approved'),
    description: t('components.workflow.audit.approvedDescription'),
    occurredAt: t('components.workflow.audit.tenMinutesAgo'),
    icon: CheckCircle2,
    tone: 'success',
  },
  {
    id: 'audit-3',
    title: t('components.workflow.audit.published'),
    description: t('components.workflow.audit.publishedDescription'),
    occurredAt: t('components.workflow.audit.oneHourAgo'),
    icon: Send,
    tone: 'default',
  },
])

function moveToPreviousStep(): void {
  currentStep.value = Math.max(currentStep.value - 1, 0)
}

function moveToNextStep(): void {
  currentStep.value = Math.min(currentStep.value + 1, workflowSteps.value.length - 1)
}

function announceCopiedCode(): void {
  toast.success(t('components.workflow.copied'))
}

function announceCopyError(): void {
  toast.error(t('components.workflow.copyError'))
}
</script>

<template>
  <div class="grid gap-4 xl:grid-cols-2">
    <ComponentDemoCard
      class="xl:col-span-2"
      :title="t('components.workflow.stepperTitle')"
      :description="t('components.workflow.stepperDescription')"
    >
      <WorkflowStepper v-model="currentStep" :steps="workflowSteps" :clickable="true" />
      <div class="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          :disabled="currentStep === 0"
          @click="moveToPreviousStep"
        >
          {{ t('components.workflow.previousStep') }}
        </Button>
        <Button
          type="button"
          :disabled="currentStep === workflowSteps.length - 1"
          @click="moveToNextStep"
        >
          {{ t('components.workflow.nextStep') }}
        </Button>
      </div>
      <template #usage>
        &lt;WorkflowStepper v-model="currentStep" :steps="steps" /&gt;
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="t('components.workflow.timelineTitle')"
      :description="t('components.workflow.timelineDescription')"
    >
      <ActivityTimeline :entries="auditEntries" />
      <template #usage>
        &lt;ActivityTimeline :entries="auditEntries" /&gt;
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="t('components.workflow.copyTitle')"
      :description="t('components.workflow.copyDescription')"
    >
      <div
        class="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <code class="break-all text-sm text-foreground">{{ invitationCode }}</code>
        <CopyButton
          :value="invitationCode"
          :label="t('components.workflow.copy')"
          :copied-label="t('components.workflow.copiedLabel')"
          :unsupported-label="t('components.workflow.clipboardUnavailable')"
          @copied="announceCopiedCode"
          @error="announceCopyError"
        />
      </div>
      <template #usage>
        &lt;CopyButton :value="invitationCode" /&gt;
      </template>
    </ComponentDemoCard>
  </div>
</template>
