<script setup lang="ts">
import type { FileUploadEntry, FileUploadRejection } from './file-upload'
import { FileSpreadsheet, LoaderCircle } from '@lucide/vue'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import Dialog from './Dialog.vue'
import Upload from './Upload.vue'

const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    accept?: string
    allowedExtensions?: readonly string[]
    maxSize?: number
    isImporting?: boolean
    uploadDescription?: string
    importLabel?: string
    importingLabel?: string
    cancelLabel?: string
  }>(),
  {
    accept: '.csv,.xlsx',
    allowedExtensions: () => [],
    maxSize: 10 * 1024 * 1024,
    isImporting: false,
  },
)

const emit = defineEmits<{
  import: [file: File]
  rejected: [rejections: FileUploadRejection[]]
}>()

const isOpen = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const selectedEntries = shallowRef<FileUploadEntry[]>([])
const selectedFile = computed(() => selectedEntries.value[0]?.file)

watch(isOpen, (open) => {
  if (!open)
    selectedEntries.value = []
})

function submitImport(): void {
  if (!selectedFile.value || props.isImporting)
    return

  // AI modified: the parent owns request state and validation results; this component only submits a verified file.
  emit('import', selectedFile.value)
}
</script>

<template>
  <Dialog
    v-model:open="isOpen"
    :title="title ?? t('components.business.importTitle')"
    :description="description ?? t('components.business.importDescription')"
    size="sm"
  >
    <Upload
      v-model="selectedEntries"
      :accept="accept"
      :allowed-extensions="allowedExtensions"
      :max-files="1"
      :max-size="maxSize"
      :multiple="false"
      :disabled="isImporting"
      :label="t('components.business.importUploadLabel')"
      :description="uploadDescription ?? t('components.business.importUploadDescription')"
      @rejected="emit('rejected', $event)"
    >
      <template #content>
        <FileSpreadsheet class="size-8 text-primary" aria-hidden="true" />
        <p class="mt-3 text-sm font-medium text-foreground">
          {{ t('components.business.importUploadLabel') }}
        </p>
        <p class="mt-1 text-xs text-muted-foreground">
          {{ uploadDescription ?? t('components.business.importUploadDescription') }}
        </p>
      </template>
    </Upload>

    <template #footer="{ close }">
      <Button type="button" variant="outline" :disabled="isImporting" @click="close">
        {{ cancelLabel ?? t('common.cancel') }}
      </Button>
      <Button type="button" :disabled="!selectedFile || isImporting" @click="submitImport">
        <LoaderCircle v-if="isImporting" class="size-4 animate-spin" aria-hidden="true" />
        {{
          isImporting
            ? (importingLabel ?? t('components.business.importing'))
            : (importLabel ?? t('components.business.importAction'))
        }}
      </Button>
    </template>
  </Dialog>
</template>
