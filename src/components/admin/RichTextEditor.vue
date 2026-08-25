<script setup lang="ts">
import { QuillEditor } from '@vueup/vue-quill'
import { ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { sanitizeRichTextHtml } from './rich-text-safety'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

const props = withDefaults(
  defineProps<{
    placeholder?: string
    readOnly?: boolean
    disabled?: boolean
    error?: string
    label?: string
    allowedImageOrigins?: readonly string[]
    toolbar?: false | string | unknown[] | Record<string, unknown>
  }>(),
  {
    placeholder: '',
    readOnly: false,
    disabled: false,
    error: '',
    label: '',
    allowedImageOrigins: () => [],
    toolbar: undefined,
  },
)

const { t } = useI18n()
const content = defineModel<string>({ default: '' })
const editorContent = ref('')
// AI modified: multiple editors keep independent error descriptions instead of repeating a document ID.
const errorId = `rich-text-editor-error-${useId()}`

watch(
  [content, () => props.allowedImageOrigins],
  ([nextContent]) => {
    const safeContent = sanitizeRichTextHtml(nextContent, {
      allowedImageOrigins: props.allowedImageOrigins,
    })
    if (safeContent !== editorContent.value)
      editorContent.value = safeContent
    // AI modified: API-loaded or restored HTML cannot leave an unsafe value in the controlled parent model.
    if (safeContent !== nextContent)
      content.value = safeContent
  },
  { immediate: true },
)

function updateContent(nextContent: string): void {
  const safeContent = sanitizeRichTextHtml(nextContent, {
    allowedImageOrigins: props.allowedImageOrigins,
  })
  editorContent.value = safeContent
  if (safeContent !== content.value)
    content.value = safeContent
}
</script>

<template>
  <div class="space-y-1.5">
    <div
      role="group"
      :aria-label="label || t('components.form.editorTitle')"
      :aria-invalid="Boolean(error)"
      :aria-describedby="error ? errorId : undefined"
    >
      <QuillEditor
        :content="editorContent"
        content-type="html"
        theme="snow"
        :enable="!readOnly && !disabled"
        :read-only="readOnly || disabled"
        :placeholder="placeholder"
        :toolbar="toolbar"
        class="rounded-md border border-input bg-background text-sm shadow-xs [&_.ql-container]:min-h-36 [&_.ql-container]:border-0 [&_.ql-editor]:min-h-36 [&_.ql-toolbar]:rounded-t-md [&_.ql-toolbar]:border-x-0 [&_.ql-toolbar]:border-t-0"
        :class="error ? 'border-destructive' : ''"
        @update:content="updateContent"
      />
    </div>
    <p v-if="error" :id="errorId" class="break-words text-sm text-destructive" role="alert">
      {{ error }}
    </p>
  </div>
</template>
