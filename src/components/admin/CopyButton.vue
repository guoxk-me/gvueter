<script setup lang="ts">
import type { ButtonVariants } from '@/components/ui/button'
import { Check, Copy } from '@lucide/vue'
import { useClipboard } from '@vueuse/core'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'

const props = withDefaults(
  defineProps<{
    value: string
    label?: string
    copiedLabel?: string
    unsupportedLabel?: string
    copiedDuring?: number
    disabled?: boolean
    iconOnly?: boolean
    variant?: ButtonVariants['variant']
    size?: ButtonVariants['size']
  }>(),
  {
    label: 'Copy',
    copiedLabel: 'Copied',
    unsupportedLabel: 'Clipboard unavailable',
    copiedDuring: 1_500,
    disabled: false,
    iconOnly: false,
    variant: 'outline',
  },
)

const emit = defineEmits<{
  copied: [value: string]
  error: []
}>()

const { copy, copied, isSupported } = useClipboard({
  copiedDuring: props.copiedDuring,
  legacy: true,
})
const buttonSize = computed<ButtonVariants['size']>(
  () => props.size ?? (props.iconOnly ? 'icon-sm' : 'sm'),
)

async function copyValue(): Promise<void> {
  if (!isSupported.value || props.disabled) return emit('error')

  try {
    await copy(props.value)
    emit('copied', props.value)
  } catch {
    emit('error')
  }
}
</script>

<template>
  <Button
    type="button"
    :variant="variant"
    :size="buttonSize"
    :disabled="disabled || !isSupported"
    :title="isSupported ? label : unsupportedLabel"
    :aria-label="copied ? copiedLabel : label"
    @click="copyValue"
  >
    <!-- AI modified: icon-only mode keeps compact description rows accessible through an explicit label. -->
    <Check
      v-if="copied"
      class="size-4 text-success"
      :class="[iconOnly ? '' : 'mr-1.5']"
      aria-hidden="true"
    />
    <Copy v-else class="size-4" :class="[iconOnly ? '' : 'mr-1.5']" aria-hidden="true" />
    <span :class="iconOnly ? 'sr-only' : ''">{{ copied ? copiedLabel : label }}</span>
  </Button>
</template>
