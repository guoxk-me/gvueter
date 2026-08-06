<script setup lang="ts">
import { PanelLeftClose, PanelLeftOpen } from '@lucide/vue'
import { AnimatePresence, m } from 'motion-v'
import { useAdminMotionTransition } from '@/composables/use-admin-motion-transition'
import { ADMIN_MOTION_TRANSITIONS } from '@/lib/motion-contract'

defineProps<{
  collapsed: boolean
}>()

const iconTransition = useAdminMotionTransition(ADMIN_MOTION_TRANSITIONS.fast)
</script>

<template>
  <!-- AI modified: the control keeps one footprint while its direction changes without an icon jump. -->
  <AnimatePresence :initial="false" mode="popLayout">
    <m.span
      :key="collapsed ? 'expand' : 'collapse'"
      class="flex size-4 items-center justify-center"
      :initial="{ opacity: 0, rotate: collapsed ? -45 : 45, scale: 0.8 }"
      :animate="{ opacity: 1, rotate: 0, scale: 1 }"
      :exit="{ opacity: 0, rotate: collapsed ? 45 : -45, scale: 0.8 }"
      :transition="iconTransition"
      aria-hidden="true"
      data-motion-part="sidebar-toggle-icon"
    >
      <PanelLeftOpen v-if="collapsed" class="size-4" />
      <PanelLeftClose v-else class="size-4" />
    </m.span>
  </AnimatePresence>
</template>
