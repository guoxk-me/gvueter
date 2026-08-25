<script setup lang="ts">
import type { DateRangeValue, FileUploadEntry, WorkflowStep } from '@/components/admin'
import type {
  FormWorkbenchErrors,
  FormWorkbenchSaveResponse,
  FormWorkbenchSubmitInput,
  FormWorkbenchValues,
  TitleAvailabilityResponse,
} from '@/features/form-workbench/types'
import { Save, Trash2 } from '@lucide/vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { toTypedSchema } from '@vee-validate/zod'
import { watchDebounced } from '@vueuse/core'
import { useForm } from 'vee-validate'
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  Callout,
  ConfirmAction,
  Dialog,
  focusFirstInvalidControl,
  PageHeader,
  WorkflowStepper,
} from '@/components/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FORM_WORKBENCH_DRAFT_DEBOUNCE_MS,
  useFormWorkbenchDraft,
} from '@/features/form-workbench/composables/useFormWorkbenchDraft'
import {
  FORM_WORKBENCH_SAVE_RESPONSE_SCHEMA,
  TITLE_AVAILABILITY_RESPONSE_SCHEMA,
} from '@/features/form-workbench/form-workbench-api-contracts'
import {
  FORM_WORKBENCH_STEP_FIELDS,
  getFormWorkbenchFingerprint,
  getLinkedBudget,
  getValidWorkbenchCity,
  getWorkbenchSubmission,
  shouldConfirmWorkbenchLeave,
} from '@/features/form-workbench/form-workbench-rules'
import { getFormWorkbenchSchema } from '@/features/form-workbench/form-workbench-schema'
import { DEFAULT_FORM_WORKBENCH_VALUES } from '@/features/form-workbench/types'
import { canAccess } from '@/lib/ability'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel } from '@/lib/display-format'
import { ApiError, get, post } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'
import WorkbenchBasicFields from './WorkbenchBasicFields.vue'
import WorkbenchContentFields from './WorkbenchContentFields.vue'
import WorkbenchReview from './WorkbenchReview.vue'

const { locale, t } = useI18n()
const router = useRouter()
const queryClient = useQueryClient()
const authStore = useAuthStore()
const workbenchForm = useTemplateRef<HTMLFormElement>('workbenchForm')
// AI modified: drafts bind to the authenticated user and tenant before any browser storage is read.
const { restoredDraft, saveDraft, clearDraft } = useFormWorkbenchDraft({
  principalId: authStore.principalId,
})
// AI modified: draft recovery timestamps remain stable across browser timezones.
const restoredDraftTimeLabel = computed(() =>
  getDateTimeLabel(restoredDraft.value?.savedAt, {
    locale: locale.value,
    timeZone: ADMIN_DISPLAY_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }),
)
const attachments = shallowRef<FileUploadEntry[]>([])
const images = shallowRef<FileUploadEntry[]>([])
const restoredAttachmentNames = shallowRef([...(restoredDraft.value?.attachmentNames ?? [])])
const restoredImageNames = shallowRef([...(restoredDraft.value?.imageNames ?? [])])
const currentStep = shallowRef(0)
const titleAvailability = shallowRef<'unknown' | 'available' | 'unavailable'>('unknown')
const isCheckingTitle = shallowRef(false)
const isAdvancingStep = shallowRef(false)
const isLeaveDialogOpen = shallowRef(false)
const isLeaveApproved = shallowRef(false)
const pendingRoutePath = shallowRef('')
const lastValidatedTitle = shallowRef('')
let titleValidationRevision = 0
let pendingTitleValidation:
  | { promise: Promise<boolean>, revision: number, title: string }
  | undefined
const canManage = computed(() => canAccess('update', 'Settings'))
const validationSchema = computed(() => toTypedSchema(getFormWorkbenchSchema(t)))
const initialValues: FormWorkbenchValues = restoredDraft.value
  ? {
      ...restoredDraft.value.values,
      reviewers: [...restoredDraft.value.values.reviewers],
      activeRange: restoredDraft.value.values.activeRange
        ? { ...restoredDraft.value.values.activeRange }
        : null,
    }
  : {
      ...DEFAULT_FORM_WORKBENCH_VALUES,
      reviewers: [],
      activeRange: null,
    }
const {
  errors,
  handleSubmit,
  isSubmitting,
  resetForm,
  setFieldError,
  setFieldValue,
  setValues,
  validateField,
  values,
} = useForm<FormWorkbenchValues>({ validationSchema, initialValues })
const saveSubmissionMutation = useMutation({
  mutationFn: (submission: FormWorkbenchSubmitInput) =>
    post<FormWorkbenchSaveResponse>('/form-workbench/submissions', submission, {
      responseSchema: FORM_WORKBENCH_SAVE_RESPONSE_SCHEMA,
    }),
})
const activeRangeModel = computed<DateRangeValue | null>({
  get: () => values.activeRange,
  set: activeRange => setFieldValue('activeRange', activeRange),
})
const richContentModel = computed({
  get: () => values.richContent,
  set: richContent => setFieldValue('richContent', richContent),
})
const markdownModel = computed({
  get: () => values.markdown,
  set: markdown => setFieldValue('markdown', markdown),
})
const attachmentNames = computed(() => attachments.value.map(entry => entry.file.name))
const imageNames = computed(() => images.value.map(entry => entry.file.name))
const draftAttachmentNames = computed(() =>
  attachmentNames.value.length ? attachmentNames.value : restoredAttachmentNames.value,
)
const draftImageNames = computed(() =>
  imageNames.value.length ? imageNames.value : restoredImageNames.value,
)
const currentSubmission = computed(() =>
  getWorkbenchSubmission(values, attachmentNames.value, imageNames.value),
)
const currentDraftSubmission = computed(() =>
  getWorkbenchSubmission(values, draftAttachmentNames.value, draftImageNames.value),
)
const committedFingerprint = shallowRef(
  getFormWorkbenchFingerprint(
    getWorkbenchSubmission(
      { ...DEFAULT_FORM_WORKBENCH_VALUES, reviewers: [], activeRange: null },
      [],
      [],
    ),
  ),
)
const currentFingerprint = computed(() => getFormWorkbenchFingerprint(currentDraftSubmission.value))
const hasUnsavedChanges = computed(() =>
  shouldConfirmWorkbenchLeave(
    currentFingerprint.value,
    committedFingerprint.value,
    isSubmitting.value || saveSubmissionMutation.isPending.value,
  ),
)
watchDebounced(
  currentDraftSubmission,
  (submission) => {
    if (!canManage.value || currentFingerprint.value === committedFingerprint.value)
      return
    // AI modified: changed values auto-save after a quiet interval while committed/cleared forms stay draft-free.
    saveDraft(submission)
  },
  { debounce: FORM_WORKBENCH_DRAFT_DEBOUNCE_MS, deep: true },
)
const steps = computed<WorkflowStep[]>(() => [
  {
    id: 'basic',
    title: t('formWorkbench.steps.basic'),
    description: t('formWorkbench.steps.basicDescription'),
  },
  {
    id: 'content',
    title: t('formWorkbench.steps.content'),
    description: t('formWorkbench.steps.contentDescription'),
  },
  {
    id: 'review',
    title: t('formWorkbench.steps.review'),
    description: t('formWorkbench.steps.reviewDescription'),
  },
])
watch(
  () => values.category,
  (category) => {
    const linkedBudget = getLinkedBudget(category, values.budget)
    if (linkedBudget !== values.budget)
      setFieldValue('budget', linkedBudget)
  },
)
watch(
  () => values.province,
  (province) => {
    const validCity = getValidWorkbenchCity(province, values.city)
    if (validCity !== values.city)
      setFieldValue('city', validCity)
  },
)
watch(
  () => values.title,
  () => {
    // AI modified: changing the title invalidates every earlier availability request.
    titleValidationRevision += 1
    isCheckingTitle.value = false
    titleAvailability.value = 'unknown'
    lastValidatedTitle.value = ''
  },
)

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : t('errors.networkError')
}

function applyBasicChanges(changes: Partial<FormWorkbenchValues>): void {
  setValues({ ...values, ...changes })
}

async function validateTitleAvailability(): Promise<boolean> {
  const titleResult = await validateField('title')
  if (!titleResult.valid)
    return false

  const title = values.title.trim()
  if (lastValidatedTitle.value === title && titleAvailability.value === 'available')
    return true
  if (
    pendingTitleValidation?.title === title
    && pendingTitleValidation.revision === titleValidationRevision
  ) {
    return pendingTitleValidation.promise
  }

  const validationRevision = titleValidationRevision
  isCheckingTitle.value = true
  // AI modified: blur and Next share one same-title check so validation cannot swallow the click.
  const availabilityPromise = (async (): Promise<boolean> => {
    try {
      const availability = await queryClient.fetchQuery({
        queryKey: ['form-workbench-title-availability', title],
        queryFn: () =>
          get<TitleAvailabilityResponse>(
            '/form-workbench/title-availability',
            { title },
            { responseSchema: TITLE_AVAILABILITY_RESPONSE_SCHEMA },
          ),
        staleTime: 30_000,
      })
      if (validationRevision !== titleValidationRevision || values.title.trim() !== title)
        return false
      lastValidatedTitle.value = title
      titleAvailability.value = availability.isAvailable ? 'available' : 'unavailable'
      if (!availability.isAvailable)
        setFieldError('title', t('formWorkbench.validation.titleExists'))
      return availability.isAvailable
    }
    catch (error: unknown) {
      if (validationRevision !== titleValidationRevision || values.title.trim() !== title)
        return false
      toast.error(getErrorMessage(error))
      return false
    }
  })()
  pendingTitleValidation = {
    promise: availabilityPromise,
    revision: validationRevision,
    title,
  }

  try {
    return await availabilityPromise
  }
  finally {
    if (pendingTitleValidation?.promise === availabilityPromise)
      pendingTitleValidation = undefined
    if (validationRevision === titleValidationRevision)
      isCheckingTitle.value = false
  }
}

async function validateCurrentStep(): Promise<boolean> {
  const stepFields = FORM_WORKBENCH_STEP_FIELDS[currentStep.value] ?? []
  const results = await Promise.all(stepFields.map(fieldName => validateField(fieldName)))
  if (results.some(result => !result.valid))
    return false
  return currentStep.value === 0 ? validateTitleAvailability() : true
}

async function goToNextStep(): Promise<void> {
  if (isAdvancingStep.value)
    return
  isAdvancingStep.value = true
  try {
    if (!canManage.value || (await validateCurrentStep())) {
      currentStep.value = Math.min(currentStep.value + 1, steps.value.length - 1)
      return
    }

    await nextTick()
    // AI modified: step validation moves focus to the first actionable error instead of only rendering text.
    focusFirstInvalidControl(workbenchForm.value)
  }
  finally {
    isAdvancingStep.value = false
  }
}

function goToPreviousStep(): void {
  currentStep.value = Math.max(currentStep.value - 1, 0)
}

function persistDraft(): void {
  saveDraft(currentDraftSubmission.value)
  toast.success(t('formWorkbench.draft.saved'))
}

function clearDraftAndForm(): void {
  clearDraft()
  attachments.value = []
  images.value = []
  restoredAttachmentNames.value = []
  restoredImageNames.value = []
  const emptyValues: FormWorkbenchValues = {
    ...DEFAULT_FORM_WORKBENCH_VALUES,
    reviewers: [],
    activeRange: null,
  }
  resetForm({ values: emptyValues })
  committedFingerprint.value = getFormWorkbenchFingerprint(
    getWorkbenchSubmission(emptyValues, [], []),
  )
  currentStep.value = 0
  titleAvailability.value = 'unknown'
  toast.success(t('formWorkbench.draft.cleared'))
}

const submitForm = handleSubmit(
  async (validatedValues) => {
    if (!canManage.value || saveSubmissionMutation.isPending.value)
      return
    if (!(await validateTitleAvailability()))
      return

    const submission = getWorkbenchSubmission(
      validatedValues,
      attachmentNames.value,
      imageNames.value,
    )
    try {
      const savedSubmission = await saveSubmissionMutation.mutateAsync(submission)
      clearDraft()
      restoredAttachmentNames.value = []
      restoredImageNames.value = []
      committedFingerprint.value = getFormWorkbenchFingerprint(submission)
      toast.success(t('formWorkbench.submitSuccess'), { description: savedSubmission.id })
    }
    catch (error: unknown) {
      if (error instanceof ApiError && error.code === 'FORM_TITLE_EXISTS') {
        // AI modified: write-time uniqueness races return to the originating field instead of becoming a detached toast.
        currentStep.value = 0
        titleAvailability.value = 'unavailable'
        setFieldError('title', t('formWorkbench.validation.titleExists'))
        await nextTick()
        workbenchForm.value?.querySelector<HTMLElement>('#workbench-title')?.focus()
        return
      }
      toast.error(getErrorMessage(error))
    }
  },
  async () => {
    await nextTick()
    focusFirstInvalidControl(workbenchForm.value)
  },
)

function confirmLeave(): void {
  const routePath = pendingRoutePath.value
  if (!routePath)
    return
  isLeaveApproved.value = true
  isLeaveDialogOpen.value = false
  void router.push(routePath)
}

onBeforeRouteLeave((to) => {
  if (!hasUnsavedChanges.value || isLeaveApproved.value)
    return true
  // AI modified: pause navigation and use the accessible app dialog instead of a blocking browser prompt.
  pendingRoutePath.value = to.fullPath
  isLeaveDialogOpen.value = true
  return false
})
</script>

<template>
  <section class="space-y-6">
    <PageHeader :title="t('formWorkbench.title')" :description="t('formWorkbench.description')">
      <template v-if="canManage" #actions>
        <Button type="button" variant="outline" @click="persistDraft">
          <Save class="size-4" aria-hidden="true" />
          {{ t('formWorkbench.draft.save') }}
        </Button>
        <ConfirmAction
          :title="t('formWorkbench.draft.clearTitle')"
          :description="t('formWorkbench.draft.clearDescription')"
          :trigger-label="t('formWorkbench.draft.clear')"
          :confirm-label="t('formWorkbench.draft.clear')"
          :cancel-label="t('common.cancel')"
          confirm-variant="destructive"
          @confirm="clearDraftAndForm"
        >
          <template #trigger>
            <Button type="button" variant="ghost">
              <Trash2 class="size-4" aria-hidden="true" />
              {{ t('formWorkbench.draft.clear') }}
            </Button>
          </template>
        </ConfirmAction>
      </template>
    </PageHeader>

    <Callout
      v-if="!canManage"
      :title="t('formWorkbench.readOnlyTitle')"
      :description="t('formWorkbench.readOnlyDescription')"
    />
    <Callout
      v-else-if="restoredDraft"
      tone="success"
      :title="t('formWorkbench.draft.restored')"
      :description="t('formWorkbench.draft.restoredAt', { time: restoredDraftTimeLabel })"
    />

    <Card>
      <CardHeader class="space-y-5">
        <div>
          <CardTitle>{{ steps[currentStep]?.title }}</CardTitle>
          <CardDescription>{{ steps[currentStep]?.description }}</CardDescription>
        </div>
        <WorkflowStepper v-model="currentStep" :steps="steps" />
      </CardHeader>
      <CardContent>
        <form ref="workbenchForm" class="space-y-6" novalidate @submit.prevent="submitForm">
          <WorkbenchBasicFields
            v-if="currentStep === 0"
            :values="values"
            :errors="errors as FormWorkbenchErrors"
            :is-disabled="!canManage"
            :is-checking-title="isCheckingTitle"
            :title-availability="titleAvailability"
            @change="applyBasicChanges"
            @blur-title="validateTitleAvailability"
          />
          <WorkbenchContentFields
            v-else-if="currentStep === 1"
            v-model:attachments="attachments"
            v-model:images="images"
            v-model:active-range="activeRangeModel"
            v-model:rich-content="richContentModel"
            v-model:markdown="markdownModel"
            :errors="errors as FormWorkbenchErrors"
            :is-disabled="!canManage"
            :restored-attachment-names="restoredAttachmentNames"
            :restored-image-names="restoredImageNames"
          />
          <WorkbenchReview v-else :submission="currentSubmission" />

          <div class="flex items-center justify-between border-t border-border pt-5">
            <Button
              type="button"
              variant="outline"
              :disabled="currentStep === 0"
              @click="goToPreviousStep"
            >
              {{ t('common.previous') }}
            </Button>
            <Button
              v-if="currentStep < steps.length - 1"
              type="button"
              :disabled="isAdvancingStep"
              @click="goToNextStep"
            >
              {{ t('common.next') }}
            </Button>
            <Button
              v-else-if="canManage"
              type="submit"
              :disabled="isSubmitting || saveSubmissionMutation.isPending.value"
            >
              {{
                isSubmitting || saveSubmissionMutation.isPending.value
                  ? t('common.saving')
                  : t('formWorkbench.submit')
              }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <Dialog
      v-model:open="isLeaveDialogOpen"
      :title="t('formWorkbench.unsavedTitle')"
      :description="t('formWorkbench.unsavedConfirm')"
    >
      <template #footer>
        <Button type="button" variant="outline" @click="isLeaveDialogOpen = false">
          {{ t('common.cancel') }}
        </Button>
        <Button type="button" variant="destructive" @click="confirmLeave">
          {{ t('formWorkbench.leaveAnyway') }}
        </Button>
      </template>
    </Dialog>
  </section>
</template>
