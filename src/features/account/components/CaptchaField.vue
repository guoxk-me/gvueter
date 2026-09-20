<script setup lang="ts">
import { RefreshCw } from '@lucide/vue'
import { computed, useAttrs, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

defineOptions({ inheritAttrs: false })

defineProps<{
  challenge: string
  isRefreshing?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()

const captchaCode = defineModel<string>({ default: '' })
const { t } = useI18n()
const attrs = useAttrs()
const challengeDescriptionId = useId()
const inputDescriptionIds = computed(() => {
  const formDescriptionIds
    = typeof attrs['aria-describedby'] === 'string' ? attrs['aria-describedby'] : ''
  return [formDescriptionIds, challengeDescriptionId].filter(Boolean).join(' ')
})
</script>

<template>
  <div class="flex gap-2">
    <Input
      v-bind="$attrs"
      v-model="captchaCode"
      inputmode="numeric"
      autocomplete="off"
      :placeholder="t('auth.captchaPlaceholder')"
      :disabled="disabled"
      :aria-describedby="inputDescriptionIds"
      class="h-11 min-w-0 flex-1 sm:h-9"
    />
    <!-- AI modified: FormControl accessibility attributes are forwarded to the real input. -->
    <div
      class="flex h-11 min-w-28 items-center justify-between gap-2 rounded-md border border-border bg-muted/45 px-3 font-mono text-sm font-semibold tabular-nums sm:h-9"
    >
      <!-- AI modified: verification expressions must not be rewritten by automatic translation. -->
      <span :id="challengeDescriptionId" role="status" aria-live="polite" aria-atomic="true">
        <span translate="no" aria-hidden="true">{{ challenge }}</span>
        <span class="sr-only">{{ t('auth.captchaChallenge', { challenge }) }}</span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        :disabled="disabled || isRefreshing"
        :aria-label="t('auth.refreshCaptcha')"
        @click="emit('refresh')"
      >
        <RefreshCw class="size-3.5" :class="{ 'animate-spin': isRefreshing }" aria-hidden="true" />
      </Button>
    </div>
  </div>
</template>
