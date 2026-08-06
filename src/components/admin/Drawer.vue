<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    side?: 'top' | 'right' | 'bottom' | 'left'
    size?: 'sm' | 'md' | 'lg' | 'xl'
    contentClass?: HTMLAttributes['class']
  }>(),
  {
    description: '',
    side: 'right',
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
      sm: 'w-full sm:max-w-sm',
      md: 'w-full sm:max-w-md',
      lg: 'w-full sm:max-w-lg',
      xl: 'w-full sm:max-w-2xl',
    })[props.size],
)

function closeDrawer(): void {
  // AI modified: expose one controlled close path so consumers do not depend on Reka internals.
  isOpen.value = false
}
</script>

<template>
  <Sheet v-model:open="isOpen">
    <SheetContent
      :side="side"
      :close-label="t('common.close')"
      :class="cn(sizeClass, contentClass)"
    >
      <SheetHeader>
        <!-- AI modified: translated header actions wrap below copy instead of colliding with it. -->
        <div class="flex min-w-0 flex-wrap items-start gap-3 pr-8">
          <div class="min-w-0 flex-1 space-y-1">
            <SheetTitle>{{ title }}</SheetTitle>
            <SheetDescription v-if="description">
              {{ description }}
            </SheetDescription>
          </div>
          <div
            v-if="$slots.headerActions"
            class="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end"
          >
            <slot name="headerActions" />
          </div>
        </div>
      </SheetHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <slot :close="closeDrawer" />
      </div>

      <SheetFooter v-if="$slots.footer">
        <slot name="footer" :close="closeDrawer" />
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
