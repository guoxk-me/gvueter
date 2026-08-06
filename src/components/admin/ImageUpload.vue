<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { FileUploadEntry, FileUploadRejection } from './file-upload'
import { ImageIcon } from '@lucide/vue'
import { onBeforeUnmount, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Upload from './Upload.vue'

const props = withDefaults(
  defineProps<{
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
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024,
    multiple: true,
    disabled: false,
  },
)

const emit = defineEmits<{
  change: [files: FileUploadEntry[]]
  rejected: [rejections: FileUploadRejection[]]
}>()

const entries = defineModel<FileUploadEntry[]>({ default: () => [] })
const { t } = useI18n()
const previewUrls = shallowRef<Record<string, string>>({})
const allowedImageExtensions = ['.jpg', '.jpeg', '.png', '.webp'] as const
const allowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const

watch(
  entries,
  (currentEntries) => {
    const currentIds = new Set(currentEntries.map((entry) => entry.id))
    const nextPreviewUrls: Record<string, string> = {}

    for (const [entryId, previewUrl] of Object.entries(previewUrls.value)) {
      if (!currentIds.has(entryId)) URL.revokeObjectURL(previewUrl)
    }

    for (const entry of currentEntries) {
      nextPreviewUrls[entry.id] = previewUrls.value[entry.id] ?? URL.createObjectURL(entry.file)
    }

    // AI modified: object URLs follow the controlled file collection so removed previews release memory.
    previewUrls.value = nextPreviewUrls
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  Object.values(previewUrls.value).forEach((previewUrl) => URL.revokeObjectURL(previewUrl))
})
</script>

<template>
  <div :class="props.class">
    <Upload
      v-model="entries"
      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
      :allowed-extensions="allowedImageExtensions"
      :allowed-mime-types="allowedImageMimeTypes"
      :max-files="maxFiles"
      :max-size="maxSize"
      :multiple="multiple"
      :disabled="disabled"
      :label="label ?? t('components.business.imageUploadLabel')"
      :description="description ?? t('components.business.imageUploadDescription')"
      :browse-label="browseLabel"
      :remove-label="removeLabel"
      @change="emit('change', $event)"
      @rejected="emit('rejected', $event)"
    />

    <ul
      v-if="entries.length > 0"
      class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3"
      aria-live="polite"
    >
      <li
        v-for="entry in entries"
        :key="entry.id"
        class="relative aspect-square overflow-hidden rounded-lg border bg-muted"
      >
        <img
          v-if="previewUrls[entry.id]"
          :src="previewUrls[entry.id]"
          :alt="entry.file.name"
          class="size-full object-cover"
        />
        <div v-else class="flex size-full items-center justify-center text-muted-foreground">
          <ImageIcon class="size-8" aria-hidden="true" />
        </div>
      </li>
    </ul>
  </div>
</template>
