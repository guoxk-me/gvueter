<script setup lang="ts">
import type { AppAction, AppSubject } from '@/lib/ability'
import { computed } from 'vue'
import { canAccess } from '@/lib/ability'

const props = defineProps<{
  action: AppAction
  subject: AppSubject
  fallback?: string
}>()

defineSlots<{
  default?: () => unknown
  fallback?: (props: { action: AppAction; subject: AppSubject }) => unknown
}>()

const hasAccess = computed(() => {
  // AI modified: use the shared permission helper so this boundary updates when CASL policies change.
  return canAccess(props.action, props.subject)
})
</script>

<template>
  <slot v-if="hasAccess" />
  <slot v-else name="fallback" :action="action" :subject="subject">
    <p v-if="fallback" class="text-sm text-muted-foreground" role="status">
      {{ fallback }}
    </p>
  </slot>
</template>
