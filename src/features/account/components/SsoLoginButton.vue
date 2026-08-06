<script setup lang="ts">
import { Building2, Loader2, RotateCw } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'

defineProps<{
  isStarting?: boolean
  providerName: string
  status: 'disabled' | 'error' | 'loading' | 'ready'
}>()

const emit = defineEmits<{
  retry: []
  start: []
}>()

const { t } = useI18n()
</script>

<template>
  <div v-if="status !== 'disabled'" class="space-y-4">
    <div class="flex items-center gap-3" aria-hidden="true">
      <span class="h-px flex-1 bg-border" />
      <span class="text-xs uppercase tracking-wide text-muted-foreground">{{ t('auth.or') }}</span>
      <span class="h-px flex-1 bg-border" />
    </div>

    <Button v-if="status === 'loading'" type="button" variant="outline" class="w-full" disabled>
      <Loader2 class="size-4 animate-spin" aria-hidden="true" />
      {{ t('auth.ssoChecking') }}
    </Button>

    <Button
      v-else-if="status === 'error'"
      type="button"
      variant="outline"
      class="w-full"
      @click="emit('retry')"
    >
      <RotateCw class="size-4" aria-hidden="true" />
      {{ t('auth.ssoRetryAvailability') }}
    </Button>

    <Button
      v-else
      type="button"
      variant="outline"
      class="w-full"
      :disabled="isStarting"
      @click="emit('start')"
    >
      <Loader2 v-if="isStarting" class="size-4 animate-spin" aria-hidden="true" />
      <Building2 v-else class="size-4" aria-hidden="true" />
      {{ isStarting ? t('auth.ssoStarting') : t('auth.ssoContinue', { provider: providerName }) }}
    </Button>
  </div>
</template>
