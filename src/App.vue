<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterView } from 'vue-router'
import ApplicationErrorBoundary from '@/components/admin/ApplicationErrorBoundary.vue'
import NetworkStatus from '@/components/admin/NetworkStatus.vue'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

const { t } = useI18n()
const shouldEnablePwa = __GVUETER_PWA_ENABLED__
// AI modified: PWA install/update UX is non-critical and loads after the application shell.
const PwaManager = defineAsyncComponent(() => import('@/features/pwa/components/PwaManager.vue'))

function reloadApplication(): void {
  window.location.reload()
}
</script>

<template>
  <!-- AI modified: one root boundary replaces fatal render and chunk failures with a recoverable surface. -->
  <ApplicationErrorBoundary :reload-application="reloadApplication">
    <TooltipProvider :delay-duration="100">
      <NetworkStatus />
      <RouterView />
      <!-- AI modified: production-only PWA prompts stay outside route lifecycles and never run beside MSW. -->
      <PwaManager v-if="shouldEnablePwa" />
      <!-- AI modified: the global toast live region and close action follow the active locale. -->
      <Toaster
        position="top-right"
        rich-colors
        :container-aria-label="t('notifications.title')"
        :toast-options="{ closeButtonAriaLabel: t('common.close') }"
      />
    </TooltipProvider>
  </ApplicationErrorBoundary>
</template>
