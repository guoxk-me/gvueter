<script setup lang="ts">
import type { DialogTitleProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DialogTitle, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<DialogTitleProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <!-- AI modified: translated and unbroken titles stay inside narrow overlay surfaces. -->
  <DialogTitle
    data-slot="dialog-title"
    v-bind="forwardedProps"
    :class="cn('min-w-0 break-words text-lg leading-none font-semibold', props.class)"
  >
    <slot />
  </DialogTitle>
</template>
