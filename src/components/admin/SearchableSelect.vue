<script setup lang="ts" generic="TValue extends string = string">
import type { HTMLAttributes } from 'vue'
import type { SearchableSelectOption } from './searchable-select'
import { Check, ChevronsUpDown, Search, X } from '@lucide/vue'
import { useFocus, useVirtualList, watchDebounced } from '@vueuse/core'
import { computed, nextTick, useId, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    options: readonly SearchableSelectOption<TValue>[]
    placeholder?: string
    searchPlaceholder?: string
    emptyLabel?: string
    loadingLabel?: string
    clearLabel?: string
    label?: string
    disabled?: boolean
    isLoading?: boolean
    clearable?: boolean
    class?: HTMLAttributes['class']
  }>(),
  {
    disabled: false,
    isLoading: false,
    clearable: false,
  },
)

const emit = defineEmits<{
  search: [query: string]
  select: [option: SearchableSelectOption<TValue>]
}>()

defineSlots<{
  option?: (props: {
    option: SearchableSelectOption<TValue>
    isSelected: boolean
    isHighlighted: boolean
  }) => unknown
}>()

const selectedValue = defineModel<TValue | null>({ default: null })
const { t } = useI18n()
const placeholderLabel = computed(() => props.placeholder ?? t('components.defaults.selectOption'))
const searchInputLabel = computed(
  () => props.searchPlaceholder ?? t('components.defaults.searchOptions'),
)
const emptyStateLabel = computed(() => props.emptyLabel ?? t('components.defaults.noOptions'))
const loadingStateLabel = computed(
  () => props.loadingLabel ?? t('components.defaults.loadingOptions'),
)
const clearActionLabel = computed(() => props.clearLabel ?? t('components.defaults.clearSelection'))
const selectLabel = computed(() => props.label ?? t('components.defaults.selectOption'))
const isOpen = defineModel<boolean>('open', { default: false })
const query = defineModel<string>('query', { default: '' })
const searchInput = useTemplateRef<HTMLInputElement>('searchInput')
const { focused } = useFocus(searchInput, { preventScroll: true })
const highlightedIndex = defineModel<number>('highlightedIndex', { default: -1 })
const listboxId = `${useId()}-listbox`

const filteredOptions = computed<SearchableSelectOption<TValue>[]>(() => {
  const searchTerm = query.value.trim().toLocaleLowerCase()
  if (!searchTerm) return [...props.options]

  return props.options.filter((option) => {
    const searchableText = [option.label, ...(option.keywords ?? [])].join(' ').toLocaleLowerCase()
    return searchableText.includes(searchTerm)
  })
})
const selectedOption = computed(() =>
  props.options.find((option) => option.value === selectedValue.value),
)
const {
  list: virtualOptions,
  containerProps,
  wrapperProps,
  scrollTo,
} = useVirtualList(filteredOptions, {
  itemHeight: 40,
  overscan: 5,
})
const activeOptionId = computed(() => {
  if (!isOpen.value || highlightedIndex.value < 0) return undefined

  const highlightedOption = filteredOptions.value[highlightedIndex.value]
  const isRendered = virtualOptions.value.some(
    (virtualOption) => virtualOption.index === highlightedIndex.value,
  )
  if (!highlightedOption || highlightedOption.disabled || !isRendered) return undefined

  return getOptionId(highlightedOption)
})

watchDebounced(
  query,
  (searchTerm) => {
    // AI modified: debounce external searches so remote option sources do not refetch on every keystroke.
    emit('search', searchTerm)
  },
  { debounce: 180, maxWait: 500 },
)

watch(isOpen, async (isNowOpen) => {
  if (isNowOpen) {
    await nextTick()
    if (!isOpen.value) return

    // AI modified: the editable combobox keeps DOM focus on its input while one option owns visual and assistive active state.
    highlightOption(getOpeningHighlightIndex())
    focused.value = true
    return
  }

  highlightedIndex.value = -1
  query.value = ''
})

watch(filteredOptions, () => {
  if (!isOpen.value) {
    highlightedIndex.value = -1
    return
  }

  highlightOption(getFirstEnabledIndex())
})

function chooseOption(option: SearchableSelectOption<TValue>): void {
  if (option.disabled) return

  selectedValue.value = option.value
  emit('select', option)
  isOpen.value = false
}

function clearSelection(): void {
  selectedValue.value = null
}

function getFirstEnabledIndex(): number {
  return filteredOptions.value.findIndex((option) => !option.disabled)
}

function getLastEnabledIndex(): number {
  for (let optionIndex = filteredOptions.value.length - 1; optionIndex >= 0; optionIndex -= 1) {
    if (!filteredOptions.value[optionIndex]?.disabled) return optionIndex
  }
  return -1
}

function getOpeningHighlightIndex(): number {
  const selectedIndex = filteredOptions.value.findIndex(
    (option) => option.value === selectedValue.value && !option.disabled,
  )
  return selectedIndex >= 0 ? selectedIndex : getFirstEnabledIndex()
}

function getOptionId(option: SearchableSelectOption<TValue>): string {
  const encodedValue =
    Array.from(option.value, (character) => character.codePointAt(0)?.toString(16) ?? '').join(
      '-',
    ) || 'empty'
  return `${listboxId}-option-${encodedValue}`
}

function highlightOption(optionIndex: number): void {
  highlightedIndex.value = optionIndex
  if (optionIndex >= 0) scrollTo(optionIndex)
}

function moveHighlight(direction: 1 | -1): void {
  const optionCount = filteredOptions.value.length
  if (optionCount === 0) return

  let candidateIndex =
    highlightedIndex.value >= 0 ? highlightedIndex.value : direction === 1 ? -1 : 0
  for (let attempt = 0; attempt < optionCount; attempt += 1) {
    candidateIndex = (candidateIndex + direction + optionCount) % optionCount
    if (!filteredOptions.value[candidateIndex]?.disabled) {
      highlightOption(candidateIndex)
      return
    }
  }
}

function handleSearchKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveHighlight(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveHighlight(-1)
    return
  }

  if (event.key === 'Home') {
    event.preventDefault()
    highlightOption(getFirstEnabledIndex())
    return
  }

  if (event.key === 'End') {
    event.preventDefault()
    highlightOption(getLastEnabledIndex())
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    const highlightedOption = filteredOptions.value[highlightedIndex.value]
    if (highlightedOption) chooseOption(highlightedOption)
    return
  }

  if (event.key === 'Escape') {
    isOpen.value = false
  }
}
</script>

<template>
  <div :class="cn('flex min-w-0 gap-1', props.class)">
    <Popover v-model:open="isOpen">
      <PopoverTrigger as-child>
        <Button
          type="button"
          variant="outline"
          :aria-label="selectLabel"
          :aria-expanded="isOpen"
          :disabled="disabled"
          class="min-w-0 flex-1 justify-between font-normal"
        >
          <span
            class="truncate"
            :class="selectedOption ? 'text-foreground' : 'text-muted-foreground'"
          >
            {{ selectedOption?.label ?? placeholderLabel }}
          </span>
          <ChevronsUpDown class="ml-2 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-(--reka-popover-trigger-width) min-w-64 p-2" align="start">
        <div class="relative">
          <Search
            class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref="searchInput"
            v-model="query"
            :placeholder="searchInputLabel"
            :aria-label="selectLabel"
            :aria-controls="listboxId"
            :aria-expanded="isOpen"
            :aria-activedescendant="activeOptionId"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            class="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent py-1 pr-3 pl-8 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            role="combobox"
            @keydown="handleSearchKeydown"
          />
        </div>
        <p v-if="isLoading" class="px-2 py-3 text-sm text-muted-foreground" role="status">
          {{ loadingStateLabel }}
        </p>
        <p
          v-else-if="filteredOptions.length === 0"
          class="px-2 py-3 text-sm text-muted-foreground"
          role="status"
        >
          {{ emptyStateLabel }}
        </p>
        <div
          :id="listboxId"
          v-bind="containerProps"
          class="max-h-56 overflow-auto"
          :class="!isLoading && filteredOptions.length > 0 ? 'mt-2' : ''"
          role="listbox"
          :aria-label="selectLabel"
          :aria-busy="isLoading"
        >
          <div v-if="!isLoading && filteredOptions.length > 0" v-bind="wrapperProps">
            <button
              v-for="virtualOption in virtualOptions"
              :id="getOptionId(virtualOption.data)"
              :key="virtualOption.data.value"
              type="button"
              role="option"
              :aria-selected="virtualOption.data.value === selectedValue"
              :disabled="virtualOption.data.disabled"
              tabindex="-1"
              class="flex h-10 w-full items-center gap-2 rounded-sm px-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              :class="
                virtualOption.index === highlightedIndex ? 'bg-accent text-accent-foreground' : ''
              "
              @mouseenter="highlightedIndex = virtualOption.index"
              @click="chooseOption(virtualOption.data)"
            >
              <Check
                class="size-4 shrink-0 text-primary"
                :class="virtualOption.data.value === selectedValue ? 'opacity-100' : 'opacity-0'"
                aria-hidden="true"
              />
              <slot
                name="option"
                :option="virtualOption.data"
                :is-selected="virtualOption.data.value === selectedValue"
                :is-highlighted="virtualOption.index === highlightedIndex"
              >
                <span class="truncate">{{ virtualOption.data.label }}</span>
              </slot>
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
    <Button
      v-if="clearable && selectedOption"
      type="button"
      variant="ghost"
      size="icon"
      :aria-label="clearActionLabel"
      :title="clearActionLabel"
      :disabled="disabled"
      @click="clearSelection"
    >
      <X class="size-4" aria-hidden="true" />
    </Button>
  </div>
</template>
