<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { FileUploadEntry, FileUploadRejection } from './file-upload'
import { useI18n } from 'vue-i18n'
import FileUpload from './FileUpload.vue'

const props = withDefaults(
  defineProps<{
    accept?: string
    allowedExtensions?: readonly string[]
    allowedMimeTypes?: readonly string[]
    maxFiles?: number
    maxSize?: number
    multiple?: boolean
    disabled?: boolean
    label?: string
    description?: string
    browseLabel?: string
    removeLabel?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    accept: '',
    allowedExtensions: () => [],
    allowedMimeTypes: () => [],
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024,
    multiple: true,
    disabled: false,
  },
)

const emit = defineEmits<{
  change: [files: FileUploadEntry[]]
  rejected: [rejections: FileUploadRejection[]]
}>()

defineSlots<{
  content?: (props: { openFileDialog: () => void; isOverDropZone: boolean }) => unknown
}>()

const entries = defineModel<FileUploadEntry[]>({ default: () => [] })
const { t } = useI18n()

function updateEntries(nextEntries: FileUploadEntry[]): void {
  // AI modified: forward the model payload itself because a controlled child still sees its previous prop during `change`.
  entries.value = nextEntries
  emit('change', nextEntries)
}
</script>

<template>
  <FileUpload
    :model-value="entries"
    :accept="accept"
    :allowed-extensions="allowedExtensions"
    :allowed-mime-types="allowedMimeTypes"
    :max-files="maxFiles"
    :max-size="maxSize"
    :multiple="multiple"
    :disabled="disabled"
    :label="label ?? t('components.upload.label')"
    :description="description ?? t('components.upload.description')"
    :browse-label="browseLabel ?? t('components.upload.browse')"
    :remove-label="removeLabel ?? t('components.upload.remove')"
    :class="props.class"
    @update:model-value="updateEntries"
    @rejected="emit('rejected', $event)"
  >
    <template v-if="$slots.content" #content="slotProps">
      <slot name="content" v-bind="slotProps" />
    </template>
  </FileUpload>
</template>
