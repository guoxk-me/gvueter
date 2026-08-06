<script setup lang="ts">
import { AnimatePresence, m } from 'motion-v'
import { computed } from 'vue'
import { useAdminMotionTransition } from '@/composables/use-admin-motion-transition'
import { ADMIN_MOTION_TRANSITIONS, ADMIN_MOTION_VARIANTS } from '@/lib/motion-contract'

const props = withDefaults(
  defineProps<{
    collapsed: boolean
    label: string
    textAlign?: 'left' | 'start'
  }>(),
  {
    textAlign: 'start',
  },
)

const labelClass = computed(() => [
  'min-w-0 flex-1 truncate',
  props.textAlign === 'left' ? 'text-left' : '',
])
const labelTransition = useAdminMotionTransition(ADMIN_MOTION_TRANSITIONS.standard)
</script>

<template>
  <!-- AI modified: compact navigation removes visual labels only after a short, interruptible exit. -->
  <AnimatePresence :initial="false" mode="popLayout">
    <m.span
      v-if="!collapsed"
      key="visible-navigation-label"
      :class="labelClass"
      :initial="ADMIN_MOTION_VARIANTS.label.initial"
      :animate="ADMIN_MOTION_VARIANTS.label.visible"
      :exit="ADMIN_MOTION_VARIANTS.label.exit"
      :transition="labelTransition"
      aria-hidden="true"
      data-motion-part="navigation-label"
    >
      {{ label }}
    </m.span>
  </AnimatePresence>
</template>
