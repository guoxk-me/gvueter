<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { FileUploadEntry, FileUploadRejection } from './file-upload'
import { FileUp, UploadCloud } from '@lucide/vue'
import { useDropZone, useFileDialog } from '@vueuse/core'
import { computed, onBeforeUnmount, toRef, useTemplateRef } from 'vue'
import { cn } from '@/lib/utils'
import { isUploadFileNameSafe, isUploadFileTypeAllowed } from './file-upload'
import FileUploadItem from './FileUploadItem.vue'

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
    label: 'Upload files',
    description: 'Drag files here or choose files from your device.',
    browseLabel: 'Browse files',
    removeLabel: 'Remove file',
  },
)

const emit = defineEmits<{
  change: [files: FileUploadEntry[]]
  rejected: [rejections: FileUploadRejection[]]
}>()

defineSlots<{
  content?: (props: { openFileDialog: () => void, isOverDropZone: boolean }) => unknown
}>()

const entries = defineModel<FileUploadEntry[]>({ default: () => [] })
const dropZoneRef = useTemplateRef<HTMLElement>('dropZone')
const isAtLimit = computed(() => entries.value.length >= maximumEntries())

const { open, onChange } = useFileDialog({
  accept: toRef(props, 'accept'),
  multiple: toRef(props, 'multiple'),
  reset: true,
})

const fileDialogListener = onChange((selectedFiles) => {
  acceptFiles(selectedFiles ? Array.from(selectedFiles) : [])
})

onBeforeUnmount(fileDialogListener.off)

const { isOverDropZone } = useDropZone(dropZoneRef, {
  multiple: props.multiple,
  onDrop: files => acceptFiles(files ?? []),
})

function maximumEntries(): number {
  return props.multiple ? Math.max(props.maxFiles, 0) : 1
}

function openFileDialog(): void {
  if (!props.disabled && !isAtLimit.value)
    open()
}

function acceptFiles(incomingFiles: File[]): void {
  if (props.disabled || incomingFiles.length === 0)
    return

  // AI modified: apply the same guards to file-dialog and drag-drop input before updating the parent model.
  const acceptedEntries: FileUploadEntry[] = []
  const rejections: FileUploadRejection[] = []
  const existingEntries = props.multiple ? entries.value : []
  const remainingSlots = Math.max(maximumEntries() - existingEntries.length, 0)

  for (const file of incomingFiles) {
    if (acceptedEntries.length >= remainingSlots) {
      rejections.push({ file, reason: 'max-files' })
      continue
    }

    if (!isUploadFileNameSafe(file.name)) {
      rejections.push({ file, reason: 'invalid-file-name' })
      continue
    }

    if (!isUploadFileTypeAllowed(file, props)) {
      rejections.push({ file, reason: 'invalid-type' })
      continue
    }

    if (file.size > props.maxSize) {
      rejections.push({ file, reason: 'file-too-large' })
      continue
    }

    if (isDuplicate(file, [...existingEntries, ...acceptedEntries])) {
      rejections.push({ file, reason: 'duplicate' })
      continue
    }

    acceptedEntries.push({ id: createEntryId(), file })
  }

  if (acceptedEntries.length > 0) {
    entries.value = props.multiple ? [...entries.value, ...acceptedEntries] : [acceptedEntries[0]!]
    emit('change', entries.value)
  }

  if (rejections.length > 0)
    emit('rejected', rejections)
}

function isDuplicate(file: File, existingEntries: FileUploadEntry[]): boolean {
  return existingEntries.some(
    entry =>
      entry.file.name === file.name
      && entry.file.size === file.size
      && entry.file.lastModified === file.lastModified,
  )
}

function createEntryId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function removeEntry(id: string): void {
  entries.value = entries.value.filter(entry => entry.id !== id)
  emit('change', entries.value)
}
</script>

<template>
  <div :class="cn('space-y-3', props.class)">
    <button
      ref="dropZone"
      type="button"
      :disabled="disabled || isAtLimit"
      class="flex min-h-40 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-5 py-6 text-center transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed"
      :class="[
        isOverDropZone && !disabled
          ? 'border-primary bg-primary/5'
          : 'border-border bg-muted/20 hover:border-primary/60 hover:bg-muted/40',
        disabled || isAtLimit ? 'cursor-not-allowed opacity-60' : '',
      ]"
      @click="openFileDialog"
    >
      <!-- AI modified: the drop zone is one native button, so keyboard upload remains accessible without nested controls. -->
      <slot name="content" :open-file-dialog="openFileDialog" :is-over-drop-zone="isOverDropZone">
        <UploadCloud class="size-8 text-primary" aria-hidden="true" />
        <p class="mt-3 text-sm font-medium text-foreground">
          {{ label }}
        </p>
        <p class="mt-1 max-w-sm text-xs text-muted-foreground">
          {{ description }}
        </p>
        <span
          class="mt-4 inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground shadow-xs"
        >
          <FileUp class="mr-2 size-4" aria-hidden="true" />
          {{ browseLabel }}
        </span>
      </slot>
    </button>

    <ul v-if="entries.length > 0" class="space-y-2" aria-live="polite">
      <FileUploadItem
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
        :remove-label="removeLabel"
        @remove="removeEntry"
      />
    </ul>
  </div>
</template>
