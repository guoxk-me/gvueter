<script setup lang="ts">
import { ChevronDown, ChevronRight } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import CopyButton from './CopyButton.vue'
import { inspectJson } from './json-viewer'

const props = defineProps<{
  value: unknown
  label?: string
  invalidLabel?: string
  expandLabel?: string
  collapseLabel?: string
  copyLabel?: string
}>()

const { t } = useI18n()
const isCollapsed = defineModel<boolean>('collapsed', { default: false })
const jsonInspection = computed(() => inspectJson(props.value))
const visibleJson = computed(() =>
  isCollapsed.value ? jsonInspection.value.collapsedText : jsonInspection.value.expandedText,
)
</script>

<template>
  <div class="overflow-hidden rounded-md border border-border bg-muted/20">
    <div class="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5">
      <span class="truncate px-1 text-xs font-medium text-muted-foreground">
        {{ label ?? t('components.editors.jsonLabel') }}
      </span>
      <div class="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          :disabled="!jsonInspection.isValid"
          :aria-label="
            isCollapsed
              ? (expandLabel ?? t('components.editors.expandJson'))
              : (collapseLabel ?? t('components.editors.collapseJson'))
          "
          @click="isCollapsed = !isCollapsed"
        >
          <ChevronRight v-if="isCollapsed" class="size-4" aria-hidden="true" />
          <ChevronDown v-else class="size-4" aria-hidden="true" />
          {{
            isCollapsed
              ? (expandLabel ?? t('components.editors.expand'))
              : (collapseLabel ?? t('components.editors.collapse'))
          }}
        </Button>
        <CopyButton
          :value="visibleJson"
          :label="copyLabel ?? t('components.editors.copyJson')"
          :disabled="!jsonInspection.isValid"
          icon-only
          variant="ghost"
        />
      </div>
    </div>
    <p v-if="!jsonInspection.isValid" class="px-3 py-4 text-sm text-destructive" role="alert">
      {{ invalidLabel ?? t('components.editors.invalidJson') }}
    </p>
    <!-- AI modified: serialized JSON remains a machine-readable value during browser translation. -->
    <pre
      v-else
      class="max-h-80 overflow-auto whitespace-pre-wrap break-words px-3 py-3 font-mono text-xs leading-5 text-foreground"
      data-testid="json-content"
      translate="no"
    >{{ visibleJson }}</pre>
  </div>
</template>
