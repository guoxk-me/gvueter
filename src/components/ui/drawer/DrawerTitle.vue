<script lang="ts" setup>
import type { DrawerTitleProps } from 'vaul-vue'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { DrawerTitle } from 'vaul-vue'
import { cn } from '@/lib/utils'

const props = defineProps<DrawerTitleProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <!-- AI modified: translated and unbroken titles stay inside narrow overlay surfaces. -->
  <DrawerTitle
    data-slot="drawer-title"
    v-bind="delegatedProps"
    :class="cn('text-foreground min-w-0 break-words font-semibold', props.class)"
  >
    <slot />
  </DrawerTitle>
</template>
