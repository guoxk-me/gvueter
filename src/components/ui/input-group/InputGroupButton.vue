<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { InputGroupButtonVariants } from '.'
import type { ButtonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { inputGroupButtonVariants } from '.'

interface InputGroupButtonProps {
  variant?: ButtonVariants['variant']
  size?: InputGroupButtonVariants['size']
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<InputGroupButtonProps>(), {
  size: 'xs',
  variant: 'ghost',
})
</script>

<template>
  <!-- AI modified: pass the semantic size so icon-only Button titles stay synchronized with their labels. -->
  <Button
    :size="props.size"
    :variant="props.variant"
    :class="cn(inputGroupButtonVariants({ size: props.size }), props.class)"
  >
    <slot />
  </Button>
</template>
