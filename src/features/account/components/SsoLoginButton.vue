<script setup lang="ts">
import { Building2, Loader2, RotateCw } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

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
  <div v-if="status === 'ready' || status === 'error'" class="space-y-4">
    <div class="flex items-center gap-3" aria-hidden="true">
      <Separator class="flex-1" />
      <span class="text-xs uppercase tracking-wide text-muted-foreground">{{ t('auth.or') }}</span>
      <Separator class="flex-1" />
    </div>

    <Button
      v-if="status === 'error'"
      type="button"
      variant="outline"
      size="lg"
      class="h-11 w-full sm:h-9"
      @click="emit('retry')"
    >
      <RotateCw class="size-4" aria-hidden="true" />
      {{ t('auth.ssoRetryAvailability') }}
    </Button>

    <Button
      v-else
      type="button"
      variant="outline"
      size="lg"
      class="h-11 w-full sm:h-9"
      :disabled="isStarting"
      @click="emit('start')"
    >
      <Loader2 v-if="isStarting" class="size-4 animate-spin" aria-hidden="true" />
      <Building2 v-else class="size-4" aria-hidden="true" />
      {{ isStarting ? t('auth.ssoStarting') : t('auth.ssoContinue', { provider: providerName }) }}
    </Button>
  </div>
</template>
