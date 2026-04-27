<script setup lang="ts">
import { computed } from 'vue'
import { Monitor, Moon, Sun } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { ButtonVariants } from '@/components/ui/button'
import { useTheme } from '@/composables/useTheme'
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
const { themeMode, cycleTheme } = useTheme()

const icon = computed(() => {
  if (themeMode.value === 'light') {
    return Sun
  }

  if (themeMode.value === 'dark') {
    return Moon
  }

  return Monitor
})

const tooltipLabel = computed(() => {
  switch (themeMode.value) {
    case 'light':
      return t('settings.themeLight')
    case 'dark':
      return t('settings.themeDark')
    default:
      return t('settings.themeSystem')
  }
})

function handleClick(event: MouseEvent) {
  cycleTheme(event)
}
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Button
        type="button"
        :variant="variant"
        :size="size"
        :class="props.class"
        :aria-label="t('settings.theme')"
        @click="handleClick"
      >
        <component :is="icon" class="size-4" aria-hidden="true" />
      </Button>
    </TooltipTrigger>
    <TooltipContent :side="side">
      {{ tooltipLabel }}
    </TooltipContent>
  </Tooltip>
</template>
