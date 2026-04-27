<script setup lang="ts">
import { Languages } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { ButtonVariants } from '@/components/ui/button'
import { useLocaleToggle } from '@/composables/useLocaleToggle'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const props = withDefaults(
  defineProps<{
    size?: ButtonVariants['size']
    variant?: ButtonVariants['variant']
    side?: 'top' | 'right' | 'bottom' | 'left'
    class?: string
  }>(),
  {
    size: 'icon-sm',
    variant: 'ghost',
    side: 'bottom',
    class: undefined,
  },
)

const { t } = useI18n()
const { localeLabel, toggleLocale } = useLocaleToggle()
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Button
        :variant="variant"
        :size="size"
        :class="props.class"
        :aria-label="t('settings.language')"
        @click="toggleLocale"
      >
        <Languages class="size-4" aria-hidden="true" />
      </Button>
    </TooltipTrigger>
    <TooltipContent :side="side">
      {{ localeLabel }}
    </TooltipContent>
  </Tooltip>
</template>
