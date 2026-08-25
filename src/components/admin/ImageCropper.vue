<script setup lang="ts">
import { Crop, ImagePlus } from '@lucide/vue'
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { getCropSourceRectangle } from './image-cropper'

const props = withDefaults(
  defineProps<{
    src?: string
    aspectRatio?: number
    outputWidth?: number
    outputType?: 'image/jpeg' | 'image/png' | 'image/webp'
    quality?: number
    maxFileSize?: number
  }>(),
  {
    src: undefined,
    aspectRatio: 1,
    outputWidth: 512,
    outputType: 'image/png',
    quality: 0.92,
    maxFileSize: 10 * 1024 * 1024,
  },
)

const emit = defineEmits<{
  cropped: [image: Blob]
  error: [message: string]
}>()

const { t } = useI18n()
const image = shallowRef<HTMLImageElement>()
const selectedSource = shallowRef(props.src)
const objectUrl = shallowRef<string>()
const zoom = shallowRef(1)
const horizontalPosition = shallowRef(0)
const verticalPosition = shallowRef(0)
const isCropping = shallowRef(false)
const errorMessage = shallowRef('')
const viewportStyle = computed(() => ({ aspectRatio: String(props.aspectRatio) }))
const imageStyle = computed(() => ({
  transform: `scale(${zoom.value}) translate(${horizontalPosition.value * 12}%, ${verticalPosition.value * 12}%)`,
}))

function releaseObjectUrl(): void {
  if (objectUrl.value)
    URL.revokeObjectURL(objectUrl.value)
  objectUrl.value = undefined
}

function reportError(message: string): void {
  errorMessage.value = message
  emit('error', message)
}

function markImageReady(): void {
  // AI modified: a recovered source clears the stale load error only after the replacement image really loads.
  errorMessage.value = ''
}

function selectImage(event: Event): void {
  const input = event.target as HTMLInputElement
  const selectedFile = input.files?.[0]
  if (!selectedFile)
    return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile.type)) {
    reportError(t('components.media.unsupportedImage'))
    input.value = ''
    return
  }
  if (selectedFile.size > props.maxFileSize) {
    reportError(t('components.media.imageTooLarge'))
    input.value = ''
    return
  }

  releaseObjectUrl()
  objectUrl.value = URL.createObjectURL(selectedFile)
  selectedSource.value = objectUrl.value
  zoom.value = 1
  horizontalPosition.value = 0
  verticalPosition.value = 0
  errorMessage.value = ''
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, props.outputType, props.quality))
}

async function cropImage(): Promise<void> {
  const sourceImage = image.value
  if (!sourceImage || !sourceImage.complete || sourceImage.naturalWidth === 0) {
    reportError(t('components.media.imageNotReady'))
    return
  }

  isCropping.value = true
  errorMessage.value = ''
  try {
    const source = getCropSourceRectangle(
      sourceImage.naturalWidth,
      sourceImage.naturalHeight,
      props.aspectRatio,
      zoom.value,
      horizontalPosition.value,
      verticalPosition.value,
    )
    const canvas = document.createElement('canvas')
    canvas.width = props.outputWidth
    canvas.height = Math.max(1, Math.round(props.outputWidth / props.aspectRatio))
    const context = canvas.getContext('2d')
    if (!context)
      throw new Error('Canvas is unavailable')

    // AI modified: export only the visible crop rectangle at a predictable business output size.
    context.drawImage(
      sourceImage,
      source.x,
      source.y,
      source.width,
      source.height,
      0,
      0,
      canvas.width,
      canvas.height,
    )
    const croppedImage = await canvasBlob(canvas)
    if (!croppedImage)
      throw new Error('The browser could not encode the cropped image')
    emit('cropped', croppedImage)
  }
  catch {
    reportError(t('components.media.cropFailed'))
  }
  finally {
    isCropping.value = false
  }
}

watch(
  () => props.src,
  (source) => {
    if (source !== selectedSource.value) {
      releaseObjectUrl()
      selectedSource.value = source
    }
  },
)

onBeforeUnmount(releaseObjectUrl)
</script>

<template>
  <div class="space-y-4">
    <label
      class="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/60"
    >
      <ImagePlus class="size-4 text-primary" aria-hidden="true" />
      {{ t('components.media.selectImage') }}
      <input
        class="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        @change="selectImage"
      >
    </label>

    <div
      class="relative mx-auto w-full max-w-md overflow-hidden rounded-lg border border-border bg-muted"
      :style="viewportStyle"
      data-testid="cropper-viewport"
    >
      <img
        v-if="selectedSource"
        ref="image"
        :src="selectedSource"
        crossorigin="anonymous"
        :alt="t('components.media.cropPreview')"
        class="size-full object-cover transition-transform duration-150"
        :style="imageStyle"
        @load="markImageReady"
        @error="reportError(t('components.media.imageLoadFailed'))"
      >
      <div v-else class="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
        {{ t('components.media.noImage') }}
      </div>
      <div
        class="pointer-events-none absolute inset-3 rounded border border-primary/80 shadow-[0_0_0_999px_color-mix(in_oklch,var(--background)_48%,transparent)]"
      />
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <label class="space-y-1 text-xs font-medium text-muted-foreground">
        {{ t('components.media.zoom') }}
        <input
          v-model.number="zoom"
          class="w-full accent-primary"
          type="range"
          min="1"
          max="4"
          step="0.05"
        >
      </label>
      <label class="space-y-1 text-xs font-medium text-muted-foreground">
        {{ t('components.media.horizontalPosition') }}
        <input
          v-model.number="horizontalPosition"
          class="w-full accent-primary"
          type="range"
          min="-1"
          max="1"
          step="0.05"
        >
      </label>
      <label class="space-y-1 text-xs font-medium text-muted-foreground">
        {{ t('components.media.verticalPosition') }}
        <input
          v-model.number="verticalPosition"
          class="w-full accent-primary"
          type="range"
          min="-1"
          max="1"
          step="0.05"
        >
      </label>
    </div>

    <p v-if="errorMessage" role="alert" class="text-sm text-destructive">
      {{ errorMessage }}
    </p>
    <Button type="button" :disabled="!selectedSource || isCropping" @click="cropImage">
      <Crop class="size-4" aria-hidden="true" />
      {{ isCropping ? t('components.media.cropping') : t('components.media.cropAction') }}
    </Button>
  </div>
</template>
