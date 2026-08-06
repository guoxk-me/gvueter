<script setup lang="ts">
import type { PrimitiveProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import type { ButtonVariants } from "../button"
import Button from "../button/Button.vue"

interface Props extends PrimitiveProps {
  class?: HTMLAttributes["class"]
  variant?: ButtonVariants["variant"]
  size?: ButtonVariants["size"]
}

// AI modified: avoid unused props binding; template reads defineProps fields directly.
withDefaults(defineProps<Props>(), {
  variant: "ghost",
  size: "icon-xs",
})
</script>

<template>
  <Button
    data-slot="attachment-action"
    :variant="variant"
    :size="size"
  >
    <slot />
  </Button>
</template>
