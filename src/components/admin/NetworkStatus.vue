<script setup lang="ts">
import { WifiOff } from '@lucide/vue'
import { useOnline } from '@vueuse/core'
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'

const isOnline = useOnline()
const { t } = useI18n()

// AI modified: keep transient connectivity feedback outside Pinia because it is not shared domain state.
watch(isOnline, (online, wasOnline) => {
  if (online && wasOnline === false) {
    toast.success(t('network.restored'))
  }
})
</script>

<template>
  <div
    v-if="!isOnline"
    role="status"
    aria-live="assertive"
    class="fixed inset-x-0 top-0 z-[100] flex min-h-9 items-center justify-center gap-2 border-b border-warning/30 bg-warning/12 px-4 py-2 text-center text-xs font-medium text-warning backdrop-blur"
  >
    <WifiOff class="size-4 shrink-0" aria-hidden="true" />
    <span>{{ t('network.offline') }}</span>
  </div>
</template>
