<script setup lang="ts">
import type { DateRangeValue, FileUploadEntry } from '@/components/admin'
import type { FormWorkbenchErrors } from '@/features/form-workbench/types'
import { useI18n } from 'vue-i18n'
import { DateRangePicker, FileUpload, RichTextEditor } from '@/components/admin'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'

defineProps<{
  errors: FormWorkbenchErrors
  isDisabled: boolean
  restoredAttachmentNames: string[]
  restoredImageNames: string[]
}>()

const attachments = defineModel<FileUploadEntry[]>('attachments', { default: () => [] })
const images = defineModel<FileUploadEntry[]>('images', { default: () => [] })
const activeRange = defineModel<DateRangeValue | null>('activeRange', { default: null })
const richContent = defineModel<string>('richContent', { default: '' })
const markdown = defineModel<string>('markdown', { default: '' })
const { t } = useI18n()
</script>

<template>
  <!-- AI modified: content controls now share one Field contract for labels, disabled state, and validation. -->
  <FieldGroup class="gap-6">
    <Field
      aria-labelledby="workbench-active-range-label"
      :aria-describedby="errors.activeRange ? 'workbench-active-range-message' : undefined"
      :data-invalid="Boolean(errors.activeRange) || undefined"
      :data-disabled="isDisabled || undefined"
    >
      <FieldLabel id="workbench-active-range-label">
        {{ t('formWorkbench.fields.activeRange') }}
      </FieldLabel>
      <p v-if="isDisabled" class="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
        {{ activeRange ? `${activeRange.start} – ${activeRange.end}` : t('common.noData') }}
      </p>
      <DateRangePicker
        v-else
        v-model="activeRange"
        :label="t('formWorkbench.fields.activeRange')"
        :placeholder="t('formWorkbench.fields.selectRange')"
        :start-label="t('formWorkbench.fields.startDate')"
        :end-label="t('formWorkbench.fields.endDate')"
        :apply-label="t('common.confirm')"
        :clear-label="t('common.reset')"
        :invalid-range-label="t('formWorkbench.validation.activeRangeRequired')"
        :is-invalid="Boolean(errors.activeRange)"
      />
      <FieldError v-if="errors.activeRange" id="workbench-active-range-message">
        {{ errors.activeRange }}
      </FieldError>
    </Field>

    <FieldGroup class="grid gap-5 xl:grid-cols-2">
      <Field aria-labelledby="workbench-attachments-label" :data-disabled="isDisabled || undefined">
        <FieldLabel id="workbench-attachments-label">
          {{ t('formWorkbench.fields.attachments') }}
        </FieldLabel>
        <FileUpload
          v-model="attachments"
          accept=".pdf,.txt,.csv"
          :max-files="3"
          :max-size="5 * 1024 * 1024"
          :disabled="isDisabled"
          :label="t('formWorkbench.upload.attachmentsLabel')"
          :description="t('formWorkbench.upload.attachmentsDescription')"
          :browse-label="t('formWorkbench.upload.browse')"
          :remove-label="t('formWorkbench.upload.remove')"
        />
        <FieldDescription v-if="restoredAttachmentNames.length">
          {{
            t('formWorkbench.draft.filesRequireReselection', {
              names: restoredAttachmentNames.join(', '),
            })
          }}
        </FieldDescription>
      </Field>
      <Field aria-labelledby="workbench-images-label" :data-disabled="isDisabled || undefined">
        <FieldLabel id="workbench-images-label">
          {{ t('formWorkbench.fields.images') }}
        </FieldLabel>
        <FileUpload
          v-model="images"
          accept="image/png,image/jpeg,image/webp"
          :max-files="2"
          :max-size="3 * 1024 * 1024"
          :disabled="isDisabled"
          :label="t('formWorkbench.upload.imagesLabel')"
          :description="t('formWorkbench.upload.imagesDescription')"
          :browse-label="t('formWorkbench.upload.browse')"
          :remove-label="t('formWorkbench.upload.remove')"
        />
        <FieldDescription v-if="restoredImageNames.length">
          {{
            t('formWorkbench.draft.filesRequireReselection', {
              names: restoredImageNames.join(', '),
            })
          }}
        </FieldDescription>
      </Field>
    </FieldGroup>

    <Field
      aria-labelledby="workbench-rich-content-label"
      :data-invalid="Boolean(errors.richContent) || undefined"
      :data-disabled="isDisabled || undefined"
    >
      <FieldLabel id="workbench-rich-content-label">
        {{ t('formWorkbench.fields.richContent') }}
      </FieldLabel>
      <RichTextEditor
        v-model="richContent"
        :read-only="isDisabled"
        :label="t('formWorkbench.fields.richContent')"
        :error="errors.richContent"
        :placeholder="t('formWorkbench.fields.richContentPlaceholder')"
      />
    </Field>

    <Field
      :data-invalid="Boolean(errors.markdown) || undefined"
      :data-disabled="isDisabled || undefined"
    >
      <FieldLabel for="workbench-markdown">
        {{ t('formWorkbench.fields.markdown') }}
      </FieldLabel>
      <Textarea
        id="workbench-markdown"
        v-model="markdown"
        name="markdown"
        rows="8"
        autocomplete="off"
        class="min-h-44 font-mono"
        :placeholder="t('formWorkbench.fields.markdownPlaceholder')"
        :disabled="isDisabled"
        :aria-invalid="Boolean(errors.markdown)"
        aria-describedby="workbench-markdown-message"
      />
      <FieldError v-if="errors.markdown" id="workbench-markdown-message">
        {{ errors.markdown }}
      </FieldError>
      <FieldDescription v-else id="workbench-markdown-message" />
    </Field>
  </FieldGroup>
</template>
