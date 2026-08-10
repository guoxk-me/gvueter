<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import type { ButtonVariants } from '.'
import { Primitive } from 'reka-ui'
import { useAttrs } from 'vue'
import { cn } from '@/lib/utils'
import { buttonVariants } from '.'

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
})

const attrs = useAttrs()
function getNativeTitle(): string | undefined {
  if (typeof attrs.title === 'string') return attrs.title
  // AI modified: resolve on every render because fallthrough attributes are intentionally non-reactive.
  return props.size?.startsWith('icon') && typeof attrs['aria-label'] === 'string'
    ? attrs['aria-label']
    : undefined
}
</script>

<template>
  <Primitive
    v-bind="attrs"
    :data-slot="typeof attrs['data-slot'] === 'string' ? attrs['data-slot'] : 'button'"
    :data-variant="variant"
    :data-size="size"
    :as="as"
    :as-child="asChild"
    :title="getNativeTitle()"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
