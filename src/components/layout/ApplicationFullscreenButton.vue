<script setup lang="ts">
import { Maximize2, Minimize2 } from '@lucide/vue'
import { useFullscreen } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const { t } = useI18n()
const { isFullscreen, isSupported, toggle } = useFullscreen()
</script>

<template>
  <Tooltip v-if="isSupported">
    <TooltipTrigger as-child>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        class="hidden sm:inline-flex"
        :aria-label="t(isFullscreen ? 'common.exitFullscreen' : 'common.enterFullscreen')"
        @click="toggle"
      >
        <Minimize2 v-if="isFullscreen" class="size-4" aria-hidden="true" />
        <Maximize2 v-else class="size-4" aria-hidden="true" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom">
      {{ t(isFullscreen ? 'common.exitFullscreen' : 'common.enterFullscreen') }}
    </TooltipContent>
  </Tooltip>
</template>
