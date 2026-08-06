<script setup lang="ts">
import { useAllowedUrlState } from '@/composables/use-allowed-url-state'
import SystemConfigWorkspace from '@/features/system-config/components/SystemConfigWorkspace.vue'
import { SYSTEM_CONFIG_SECTIONS } from '@/features/system-config/types'

defineOptions({ name: 'SystemConfigPage' })

const activeSection = useAllowedUrlState({
  kind: 'string',
  queryKey: 'configSection',
  allowedStates: SYSTEM_CONFIG_SECTIONS,
  defaultState: 'site',
  history: 'push',
})
</script>

<template>
  <SystemConfigWorkspace v-model:active-section="activeSection" />
</template>
