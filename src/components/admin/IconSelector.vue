<script setup lang="ts">
import type { AdminIconCategory, AdminIconKey, AdminIconOption } from './icon-selector'
import { Check, ChevronsUpDown, Search, X } from '@lucide/vue'
import { computed, shallowRef, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ADMIN_ICON_CATEGORIES, ADMIN_ICON_OPTIONS } from './icon-selector'

withDefaults(
  defineProps<{
    placeholder?: string
    label?: string
    clearLabel?: string
    searchPlaceholder?: string
    emptyLabel?: string
    disabled?: boolean
    clearable?: boolean
  }>(),
  {
    disabled: false,
    clearable: true,
  },
)

const { locale, t } = useI18n()
const selectedIconKey = defineModel<AdminIconKey | undefined>()
const isOpen = defineModel<boolean>('open', { default: false })
const searchQuery = shallowRef('')
const selectedCategory = shallowRef<AdminIconCategory | 'all'>('all')
const listboxId = `admin-icon-options-${useId()}`
const selectedIcon = computed(() =>
  ADMIN_ICON_OPTIONS.find((option) => option.key === selectedIconKey.value),
)
// AI modified: search and category state derive one visible allow-listed set without changing the emitted key contract.
const visibleIconOptions = computed(() => {
  const requestedText = searchQuery.value.trim().toLocaleLowerCase(locale.value)

  return ADMIN_ICON_OPTIONS.filter((option) => {
    if (selectedCategory.value !== 'all' && option.category !== selectedCategory.value) return false
    if (!requestedText) return true

    return [
      option.key,
      option.lucideName,
      getIconLabel(option),
      getCategoryLabel(option.category),
    ].some((searchableText) =>
      searchableText.toLocaleLowerCase(locale.value).includes(requestedText),
    )
  })
})

function getIconLabel(option: AdminIconOption): string {
  return option.labelKey ? t(option.labelKey) : option.lucideName
}

function getCategoryLabel(category: AdminIconCategory): string {
  return t(`components.selectors.iconCategories.${category}`)
}

function selectIcon(iconKey: AdminIconKey): void {
  // AI modified: selection is restricted to the audited local allow-list and only its stable key leaves the component.
  selectedIconKey.value = iconKey
  isOpen.value = false
}
</script>

<template>
  <div class="flex min-w-0 gap-1">
    <Popover v-model:open="isOpen">
      <PopoverTrigger as-child>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          class="min-w-0 flex-1 justify-between font-normal"
          :aria-label="label ?? t('components.selectors.iconLabel')"
          :aria-expanded="isOpen"
          :aria-controls="isOpen ? listboxId : undefined"
          :disabled="disabled"
        >
          <span class="flex min-w-0 items-center gap-2 truncate">
            <component
              :is="selectedIcon.component"
              v-if="selectedIcon"
              class="size-4 shrink-0"
              aria-hidden="true"
            />
            <span class="truncate" :class="selectedIcon ? '' : 'text-muted-foreground'">
              {{
                selectedIcon
                  ? getIconLabel(selectedIcon)
                  : (placeholder ?? t('components.selectors.iconPlaceholder'))
              }}
            </span>
          </span>
          <ChevronsUpDown class="ml-2 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="icon-selector-popover p-3" align="start">
        <div class="relative">
          <Search
            class="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            v-model="searchQuery"
            type="search"
            class="pl-9"
            :aria-label="searchPlaceholder ?? t('components.selectors.iconSearchPlaceholder')"
            :placeholder="searchPlaceholder ?? t('components.selectors.iconSearchPlaceholder')"
            @keydown.escape="isOpen = false"
          />
        </div>

        <div
          class="mt-3 flex min-w-0 gap-1 overflow-x-auto pb-1"
          :aria-label="t('components.selectors.iconCategoriesLabel')"
        >
          <Button
            type="button"
            size="sm"
            class="shrink-0"
            :variant="selectedCategory === 'all' ? 'default' : 'outline'"
            :aria-pressed="selectedCategory === 'all'"
            @click="selectedCategory = 'all'"
          >
            {{ t('components.selectors.iconCategoryAll') }}
          </Button>
          <Button
            v-for="category in ADMIN_ICON_CATEGORIES"
            :key="category"
            type="button"
            size="sm"
            class="shrink-0"
            :variant="selectedCategory === category ? 'default' : 'outline'"
            :aria-pressed="selectedCategory === category"
            @click="selectedCategory = category"
          >
            {{ getCategoryLabel(category) }}
          </Button>
        </div>

        <p class="my-2 text-xs text-muted-foreground" role="status" aria-live="polite">
          {{ t('components.selectors.iconResults', { count: visibleIconOptions.length }) }}
        </p>

        <div
          v-if="visibleIconOptions.length > 0"
          :id="listboxId"
          class="icon-selector-grid max-h-72 overflow-y-auto pr-1"
          role="listbox"
          :aria-label="label ?? t('components.selectors.iconLabel')"
        >
          <button
            v-for="option in visibleIconOptions"
            :key="option.key"
            type="button"
            role="option"
            :data-icon-option-key="option.key"
            :aria-selected="selectedIconKey === option.key"
            :aria-label="getIconLabel(option)"
            class="relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
            @click="selectIcon(option.key)"
          >
            <component :is="option.component" class="size-5" aria-hidden="true" />
            <span class="max-w-full truncate">{{ getIconLabel(option) }}</span>
            <Check
              v-if="selectedIconKey === option.key"
              class="absolute top-1 right-1 size-3 text-primary"
              aria-hidden="true"
            />
          </button>
        </div>
        <p
          v-else
          :id="listboxId"
          class="rounded-md border border-dashed px-3 py-8 text-center text-sm text-muted-foreground"
          role="status"
        >
          {{ emptyLabel ?? t('components.selectors.iconNoResults') }}
        </p>
      </PopoverContent>
    </Popover>
    <Button
      v-if="clearable && selectedIcon"
      type="button"
      variant="ghost"
      size="icon"
      :disabled="disabled"
      :aria-label="clearLabel ?? t('components.selectors.clearIcon')"
      @click="selectedIconKey = undefined"
    >
      <X class="size-4" aria-hidden="true" />
    </Button>
  </div>
</template>

<style scoped>
.icon-selector-popover {
  width: min(36rem, calc(100vw - 2rem));
}

.icon-selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr));
  gap: 0.25rem;
}
</style>
