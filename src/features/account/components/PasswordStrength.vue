<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getPasswordStrength } from '@/features/account/password-strength'

const props = defineProps<{ password: string }>()
const { t } = useI18n()
const strength = computed(() => getPasswordStrength(props.password))
const strengthLabel = computed(() => {
  if (strength.value.score <= 1) return t('account.passwordStrengthWeak')
  if (strength.value.score === 2) return t('account.passwordStrengthFair')
  if (strength.value.score === 3) return t('account.passwordStrengthGood')
  return t('account.passwordStrengthStrong')
})
</script>

<template>
  <div class="space-y-1.5" role="status" aria-live="polite">
    <div class="flex gap-1" aria-hidden="true">
      <span
        v-for="segment in 4"
        :key="segment"
        class="h-1 flex-1 rounded-full transition-colors"
        :class="
          segment <= strength.score ? (strength.isStrong ? 'bg-success' : 'bg-warning') : 'bg-muted'
        "
      />
    </div>
    <p class="text-xs text-muted-foreground">
      {{ t('account.passwordStrength', { strength: strengthLabel }) }}
    </p>
  </div>
</template>
