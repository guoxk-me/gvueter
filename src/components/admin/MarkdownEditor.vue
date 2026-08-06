<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import MarkdownPreview from './MarkdownPreview'

withDefaults(
  defineProps<{
    label?: string
    previewLabel?: string
    placeholder?: string
    readOnly?: boolean
    disabled?: boolean
    error?: string
    allowedImageOrigins?: readonly string[]
  }>(),
  {
    readOnly: false,
    disabled: false,
    error: '',
    allowedImageOrigins: () => [],
  },
)

const { t } = useI18n()
const markdownSource = defineModel<string>({ default: '' })
// AI modified: repeated Markdown editors expose unique error-description relationships.
const errorId = `markdown-editor-error-${useId()}`
const sourceId = `markdown-editor-source-${useId()}`
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-2">
    <div class="space-y-2">
      <Label :for="sourceId">{{ label ?? t('components.editors.markdownSource') }}</Label>
      <Textarea
        :id="sourceId"
        v-model="markdownSource"
        :placeholder="placeholder ?? t('components.editors.markdownPlaceholder')"
        :readonly="readOnly"
        :disabled="disabled"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? errorId : undefined"
        :aria-label="label ?? t('components.editors.markdownSource')"
        class="min-h-48 resize-y font-mono leading-6"
      />
      <p v-if="error" :id="errorId" class="break-words text-sm text-destructive" role="alert">
        {{ error }}
      </p>
    </div>
    <div class="space-y-2">
      <p class="text-sm font-medium">
        {{ previewLabel ?? t('components.editors.plainTextPreview') }}
      </p>
      <!-- AI modified: a typed renderer supports Markdown without executing raw HTML or unsafe URLs. -->
      <MarkdownPreview
        :source="markdownSource"
        :label="previewLabel ?? t('components.editors.plainTextPreview')"
        :allowed-image-origins="[...allowedImageOrigins]"
      />
    </div>
  </div>
</template>
