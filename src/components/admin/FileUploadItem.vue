<script setup lang="ts">
import type { Component } from 'vue'
import type { FileUploadEntry } from './file-upload'
import { File, FileImage, FileText, Trash2 } from '@lucide/vue'
import { useObjectUrl } from '@vueuse/core'
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { getFileSizeLabel } from '@/lib/display-format'

const props = defineProps<{
  entry: FileUploadEntry
  removeLabel: string
}>()

const emit = defineEmits<{
  remove: [id: string]
}>()

const { locale } = useI18n()
const file = toRef(props.entry, 'file')
const previewUrl = useObjectUrl(file)
const isImage = computed(() => props.entry.file.type.startsWith('image/'))
const fileIcon = computed<Component>(() => {
  if (isImage.value)
    return FileImage
  if (props.entry.file.type.includes('pdf') || props.entry.file.type.includes('text'))
    return FileText
  return File
})
// AI modified: upload rows no longer depend on the browser's numeric defaults.
const fileSize = computed(() => getFileSizeLabel(props.entry.file.size, { locale: locale.value }))
</script>

<template>
  <li class="flex min-w-0 items-center gap-3 rounded-md border border-border bg-background p-2.5">
    <img
      v-if="isImage && previewUrl"
      :src="previewUrl"
      :alt="entry.file.name"
      class="size-10 shrink-0 rounded object-cover"
    >
    <div
      v-else
      class="flex size-10 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground"
    >
      <component :is="fileIcon" class="size-5" aria-hidden="true" />
    </div>
    <div class="min-w-0 flex-1">
      <!-- AI modified: native title preserves the complete safe filename when the row must truncate. -->
      <p class="truncate text-sm font-medium text-foreground" :title="entry.file.name">
        {{ entry.file.name }}
      </p>
      <p class="text-xs text-muted-foreground">
        {{ fileSize }}
      </p>
    </div>
    <button
      type="button"
      class="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      :aria-label="`${removeLabel}: ${entry.file.name}`"
      :title="removeLabel"
      @click="emit('remove', entry.id)"
    >
      <Trash2 class="size-4" aria-hidden="true" />
    </button>
  </li>
</template>
