<script setup lang="ts">
import { defineAsyncComponent, onErrorCaptured, shallowRef } from 'vue'
import { RouterView } from 'vue-router'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { applicationFailure, setApplicationFailure } from '@/lib/application-recovery'
import { reportVueError } from '@/lib/observability'

const hasRenderFailure = shallowRef(false)
const shouldEnablePwa = __GVUETER_PWA_ENABLED__
const PwaManager = defineAsyncComponent(() => import('@/features/pwa/components/PwaManager.vue'))

onErrorCaptured((failure, instance, lifecycleInfo) => {
  // AI modified: the empty starter shows a recovery surface if a retained platform component fails.
  hasRenderFailure.value = true
  setApplicationFailure('vue-runtime')
  reportVueError(failure, instance, lifecycleInfo)
  return false
})

function reloadApplication(): void {
  window.location.reload()
}
</script>

<template>
  <main
    v-if="hasRenderFailure || applicationFailure"
    class="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center"
    role="alert"
    data-application-recovery="runtime"
  >
    <h1 class="text-xl font-semibold">
      Application unavailable
    </h1>
    <button class="rounded-md border px-4 py-2" @click="reloadApplication">
      Reload
    </button>
  </main>
  <TooltipProvider v-else>
    <RouterView />
    <PwaManager v-if="shouldEnablePwa" />
    <Toaster position="top-right" />
  </TooltipProvider>
</template>
