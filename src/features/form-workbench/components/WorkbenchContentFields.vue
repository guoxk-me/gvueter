<script setup lang="ts">
import type { DateRangeValue, FileUploadEntry } from '@/components/admin'
import type { FormWorkbenchErrors } from '@/features/form-workbench/types'
import { useI18n } from 'vue-i18n'
import { DateRangePicker, FileUpload, RichTextEditor } from '@/components/admin'

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
  <div class="space-y-6">
    <div class="space-y-2">
      <p class="text-sm font-medium">
        {{ t('formWorkbench.fields.activeRange') }}
      </p>
      <p v-if="isDisabled" class="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
        {{ activeRange ? `${activeRange.start} – ${activeRange.end}` : t('common.noData') }}
      </p>
      <DateRangePicker
        v-else
        v-model="activeRange"
        :placeholder="t('formWorkbench.fields.selectRange')"
        :start-label="t('formWorkbench.fields.startDate')"
        :end-label="t('formWorkbench.fields.endDate')"
        :apply-label="t('common.confirm')"
        :clear-label="t('common.reset')"
        :invalid-range-label="t('formWorkbench.validation.activeRangeRequired')"
        :is-invalid="Boolean(errors.activeRange)"
      />
      <p v-if="errors.activeRange" class="text-xs text-destructive" role="alert">
        {{ errors.activeRange }}
      </p>
    </div>

    <div class="grid gap-5 xl:grid-cols-2">
      <div class="space-y-2">
        <p class="text-sm font-medium">
          {{ t('formWorkbench.fields.attachments') }}
        </p>
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
        <p v-if="restoredAttachmentNames.length" class="text-xs text-muted-foreground">
          {{
            t('formWorkbench.draft.filesRequireReselection', {
              names: restoredAttachmentNames.join(', '),
            })
          }}
        </p>
      </div>
      <div class="space-y-2">
        <p class="text-sm font-medium">
          {{ t('formWorkbench.fields.images') }}
        </p>
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
        <p v-if="restoredImageNames.length" class="text-xs text-muted-foreground">
          {{
            t('formWorkbench.draft.filesRequireReselection', {
              names: restoredImageNames.join(', '),
            })
          }}
        </p>
      </div>
    </div>

    <div class="space-y-2">
      <p class="text-sm font-medium">
        {{ t('formWorkbench.fields.richContent') }}
      </p>
      <RichTextEditor
        v-model="richContent"
        :read-only="isDisabled"
        :label="t('formWorkbench.fields.richContent')"
        :error="errors.richContent"
        :placeholder="t('formWorkbench.fields.richContentPlaceholder')"
      />
    </div>

    <div class="space-y-2">
      <label for="workbench-markdown" class="text-sm font-medium">
        {{ t('formWorkbench.fields.markdown') }}
      </label>
      <textarea
        id="workbench-markdown"
        v-model="markdown"
        rows="8"
        class="min-h-44 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
        :placeholder="t('formWorkbench.fields.markdownPlaceholder')"
        :disabled="isDisabled"
        :aria-invalid="Boolean(errors.markdown)"
      />
      <p v-if="errors.markdown" class="text-xs text-destructive" role="alert">
        {{ errors.markdown }}
      </p>
    </div>
  </div>
</template>
