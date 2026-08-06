<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  Dialog as DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    contentClass?: HTMLAttributes['class']
  }>(),
  {
    description: '',
    size: 'md',
  },
)

defineSlots<{
  default?: (props: { close: () => void }) => unknown
  headerActions?: () => unknown
  footer?: (props: { close: () => void }) => unknown
}>()

const isOpen = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const sizeClass = computed(
  () =>
    ({
      sm: 'sm:max-w-sm',
      md: 'sm:max-w-lg',
      lg: 'sm:max-w-2xl',
      xl: 'sm:max-w-4xl',
    })[props.size],
)

function closeDialog(): void {
  // AI modified: expose one controlled close path so consumers do not depend on Reka internals.
  isOpen.value = false
}
</script>

<template>
  <DialogRoot v-model:open="isOpen">
    <DialogContent
      :close-label="t('common.close')"
      :class="
        cn('max-h-[calc(100vh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto]', sizeClass, contentClass)
      "
    >
      <DialogHeader>
        <!-- AI modified: translated header actions wrap below copy instead of colliding with it. -->
        <div class="flex min-w-0 flex-wrap items-start gap-3 pr-8">
          <div class="min-w-0 flex-1 space-y-1">
            <DialogTitle>{{ title }}</DialogTitle>
            <DialogDescription v-if="description">
              {{ description }}
            </DialogDescription>
          </div>
          <div
            v-if="$slots.headerActions"
            class="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end"
          >
            <slot name="headerActions" />
          </div>
        </div>
      </DialogHeader>

      <div class="min-h-0 overflow-y-auto">
        <slot :close="closeDialog" />
      </div>

      <DialogFooter v-if="$slots.footer">
        <slot name="footer" :close="closeDialog" />
      </DialogFooter>
    </DialogContent>
  </DialogRoot>
</template>
