<script setup lang="ts">
import type { QrCodeErrorLevel } from './qr-code'
import { Download } from '@lucide/vue'
import { toCanvas } from 'qrcode'
import { nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { getQrCodeDownloadName } from './qr-code'

const props = withDefaults(
  defineProps<{
    value: string
    size?: number
    margin?: number
    errorCorrectionLevel?: QrCodeErrorLevel
    foreground?: string
    background?: string
    downloadFileName?: string
    downloadable?: boolean
  }>(),
  {
    size: 192,
    margin: 2,
    errorCorrectionLevel: 'M',
    foreground: undefined,
    background: undefined,
    downloadFileName: 'qr-code.png',
    downloadable: true,
  },
)

const emit = defineEmits<{
  rendered: []
  error: [message: string]
}>()

const { t } = useI18n()
const canvas = shallowRef<HTMLCanvasElement>()
const errorMessage = shallowRef('')
let themeObserver: MutationObserver | undefined
let renderRevision = 0

function qrColor(
  requestedColor: string | undefined,
  token: '--background' | '--foreground',
  fallback: string,
): string {
  const themeValue =
    requestedColor ?? getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  const colorCanvas = document.createElement('canvas')
  colorCanvas.width = 1
  colorCanvas.height = 1
  const context = colorCanvas.getContext('2d')
  if (!context) return fallback

  // AI modified: qrcode accepts HEX while design tokens use OKLCH, so resolve through the browser color engine.
  context.fillStyle = fallback
  context.fillStyle = themeValue || fallback
  context.fillRect(0, 0, 1, 1)
  const [red = 0, green = 0, blue = 0, alpha = 255] = context.getImageData(0, 0, 1, 1).data
  const colorChannels = [red, green, blue, alpha].map((channel) =>
    channel.toString(16).padStart(2, '0'),
  )
  return `#${colorChannels.join('')}`
}

async function renderQrCode(): Promise<void> {
  const targetCanvas = canvas.value
  const payload = props.value.trim()
  const revision = ++renderRevision
  if (!targetCanvas || !payload) {
    errorMessage.value = payload ? '' : t('components.media.qrValueRequired')
    return
  }

  try {
    await toCanvas(targetCanvas, payload, {
      width: Math.min(Math.max(props.size, 96), 1024),
      margin: Math.min(Math.max(props.margin, 0), 8),
      errorCorrectionLevel: props.errorCorrectionLevel,
      color: {
        dark: qrColor(props.foreground, '--foreground', '#111827'),
        light: qrColor(props.background, '--background', '#ffffff'),
      },
    })
    if (revision !== renderRevision) return
    errorMessage.value = ''
    emit('rendered')
  } catch {
    if (revision !== renderRevision) return
    errorMessage.value = t('components.media.qrRenderFailed')
    emit('error', errorMessage.value)
  }
}

function downloadQrCode(): void {
  if (!canvas.value || errorMessage.value) return
  const downloadLink = document.createElement('a')
  downloadLink.download = getQrCodeDownloadName(props.downloadFileName)
  downloadLink.href = canvas.value.toDataURL('image/png')
  downloadLink.click()
}

watch(
  () => [
    props.value,
    props.size,
    props.margin,
    props.errorCorrectionLevel,
    props.foreground,
    props.background,
  ],
  () => nextTick(renderQrCode),
)

onMounted(() => {
  void renderQrCode()
  themeObserver = new MutationObserver(() => void renderQrCode())
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style'],
  })
})

onBeforeUnmount(() => {
  renderRevision += 1
  themeObserver?.disconnect()
})
</script>

<template>
  <figure
    class="inline-flex max-w-full flex-col items-center gap-3 rounded-lg border border-border bg-card p-4"
  >
    <canvas
      ref="canvas"
      role="img"
      :aria-label="t('components.media.qrCodeLabel')"
      class="max-w-full rounded"
    />
    <p v-if="errorMessage" role="alert" class="text-sm text-destructive">
      {{ errorMessage }}
    </p>
    <Button
      v-if="downloadable"
      type="button"
      variant="outline"
      size="sm"
      :disabled="Boolean(errorMessage)"
      @click="downloadQrCode"
    >
      <Download class="size-4" aria-hidden="true" />
      {{ t('components.media.downloadQrCode') }}
    </Button>
  </figure>
</template>
