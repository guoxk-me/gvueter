<script setup lang="ts">
import { Download, RefreshCw, X } from '@lucide/vue'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { usePwaLifecycle } from '../composables/use-pwa-lifecycle'

const { t } = useI18n()
const {
  canInstall,
  canUpdate,
  isInstalling,
  isUpdating,
  offlineReady,
  dismissInstall,
  dismissUpdate,
  installApplication,
  updateApplication,
} = usePwaLifecycle()

const promptMode = computed<'install' | 'update' | undefined>(() => {
  if (canUpdate.value) return 'update'
  if (canInstall.value) return 'install'
  return undefined
})
const promptTitle = computed(() =>
  promptMode.value === 'update' ? t('pwa.updateTitle') : t('pwa.installTitle'),
)
const promptDescription = computed(() =>
  promptMode.value === 'update' ? t('pwa.updateDescription') : t('pwa.installDescription'),
)
const primaryLabel = computed(() =>
  promptMode.value === 'update' ? t('pwa.updateAction') : t('pwa.installAction'),
)
const isBusy = computed(() =>
  promptMode.value === 'update' ? isUpdating.value : isInstalling.value,
)

async function acceptPrompt(): Promise<void> {
  if (promptMode.value === 'update') {
    await updateApplication()
    return
  }

  const outcome = await installApplication()
  if (outcome === 'accepted') toast.success(t('pwa.installAccepted'))
}

function dismissPrompt(): void {
  if (promptMode.value === 'update') dismissUpdate()
  else dismissInstall()
}

watch(offlineReady, (isReady) => {
  if (!isReady) return
  toast.success(t('pwa.offlineReady'))
  offlineReady.value = false
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-y-3 opacity-0"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="translate-y-3 opacity-0"
  >
    <Card
      v-if="promptMode"
      data-pwa-prompt
      role="status"
      aria-live="polite"
      class="fixed right-4 bottom-4 z-[90] w-[min(24rem,calc(100vw-2rem))] border-border/80 bg-card/95 shadow-xl backdrop-blur"
    >
      <CardContent class="flex items-start gap-3 p-4">
        <div
          class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary"
        >
          <RefreshCw v-if="promptMode === 'update'" class="size-4" aria-hidden="true" />
          <Download v-else class="size-4" aria-hidden="true" />
        </div>

        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-foreground">{{ promptTitle }}</p>
          <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ promptDescription }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <Button size="sm" :disabled="isBusy" @click="acceptPrompt">
              {{ isBusy ? t('common.loading') : primaryLabel }}
            </Button>
            <Button size="sm" variant="ghost" :disabled="isBusy" @click="dismissPrompt">
              {{ t('pwa.later') }}
            </Button>
          </div>
        </div>

        <Button
          size="icon"
          variant="ghost"
          class="size-8 shrink-0"
          :aria-label="t('pwa.dismiss')"
          :disabled="isBusy"
          @click="dismissPrompt"
        >
          <X class="size-4" aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  </Transition>
</template>
