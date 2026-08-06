<script setup lang="ts">
import type { SelectionOption } from '../selection-examples'
import { Check, ChevronsUpDown, Search, X } from '@lucide/vue'
import { computed, nextTick, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const props = withDefaults(
  defineProps<{
    options: readonly SelectionOption[]
    label: string
    placeholder: string
    searchPlaceholder: string
    emptyLabel: string
    clearLabel: string
    removeLabel: string
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const selectedValues = defineModel<string[]>({ default: () => [] })
const isOpen = shallowRef(false)
const query = shallowRef('')
const highlightedIndex = shallowRef(-1)
const searchInput = useTemplateRef<HTMLInputElement>('searchInput')
const listboxId = `${useId()}-listbox`

const selectedOptions = computed(() =>
  props.options.filter((option) => selectedValues.value.includes(option.value)),
)
const visibleOptions = computed(() => {
  const requestedText = query.value.trim().toLocaleLowerCase()
  if (!requestedText) return props.options

  return props.options.filter((option) => {
    const searchableText = `${option.label} ${option.description ?? ''}`.toLocaleLowerCase()
    return searchableText.includes(requestedText)
  })
})
const activeOptionId = computed(() => {
  if (!isOpen.value || highlightedIndex.value < 0) return undefined

  const highlightedOption = visibleOptions.value[highlightedIndex.value]
  if (!highlightedOption || highlightedOption.disabled) return undefined
  return getOptionId(highlightedOption)
})

watch(isOpen, async (isNowOpen) => {
  if (isNowOpen) {
    await nextTick()
    if (!isOpen.value) return

    // AI modified: keep DOM focus on the searchable combobox while the active option owns listbox state.
    highlightOption(getOpeningHighlightIndex())
    searchInput.value?.focus({ preventScroll: true })
    return
  }

  highlightedIndex.value = -1
  query.value = ''
})

watch(visibleOptions, () => {
  if (!isOpen.value) {
    highlightedIndex.value = -1
    return
  }

  highlightOption(getFirstEnabledIndex())
})

function toggleOption(option: SelectionOption): void {
  if (option.disabled) return

  // AI modified: multi-select updates are immutable so parent forms receive one predictable v-model event.
  selectedValues.value = selectedValues.value.includes(option.value)
    ? selectedValues.value.filter((value) => value !== option.value)
    : [...selectedValues.value, option.value]
}

function removeOption(optionValue: string): void {
  selectedValues.value = selectedValues.value.filter((value) => value !== optionValue)
}

function clearSelection(): void {
  selectedValues.value = []
  void nextTick(() => searchInput.value?.focus({ preventScroll: true }))
}

function getOptionId(option: SelectionOption): string {
  const encodedValue =
    Array.from(option.value, (character) => character.codePointAt(0)?.toString(16) ?? '').join(
      '-',
    ) || 'empty'
  return `${listboxId}-option-${encodedValue}`
}

function getFirstEnabledIndex(): number {
  return visibleOptions.value.findIndex((option) => !option.disabled)
}

function getLastEnabledIndex(): number {
  for (let optionIndex = visibleOptions.value.length - 1; optionIndex >= 0; optionIndex -= 1) {
    if (!visibleOptions.value[optionIndex]?.disabled) return optionIndex
  }
  return -1
}

function getOpeningHighlightIndex(): number {
  const selectedIndex = visibleOptions.value.findIndex(
    (option) => selectedValues.value.includes(option.value) && !option.disabled,
  )
  return selectedIndex >= 0 ? selectedIndex : getFirstEnabledIndex()
}

function highlightOption(optionIndex: number): void {
  highlightedIndex.value = optionIndex
  const option = visibleOptions.value[optionIndex]
  if (!option) return

  void nextTick(() => {
    document.getElementById(getOptionId(option))?.scrollIntoView?.({ block: 'nearest' })
  })
}

function moveHighlight(direction: 1 | -1): void {
  const optionCount = visibleOptions.value.length
  if (optionCount === 0) return

  let candidateIndex =
    highlightedIndex.value >= 0 ? highlightedIndex.value : direction === 1 ? -1 : 0
  for (let attempt = 0; attempt < optionCount; attempt += 1) {
    candidateIndex = (candidateIndex + direction + optionCount) % optionCount
    if (!visibleOptions.value[candidateIndex]?.disabled) {
      highlightOption(candidateIndex)
      return
    }
  }
}

function toggleHighlightedOption(): void {
  const highlightedOption = visibleOptions.value[highlightedIndex.value]
  if (highlightedOption) toggleOption(highlightedOption)
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

  if (event.key === 'Enter' || (event.key === ' ' && query.value.length === 0)) {
    // AI modified: Space selects only for an empty query so multi-word searches remain editable.
    event.preventDefault()
    toggleHighlightedOption()
    return
  }

  if (event.key === 'Escape') isOpen.value = false
}
</script>

<template>
  <div class="min-w-0 space-y-2">
    <Popover v-model:open="isOpen">
      <PopoverTrigger as-child>
        <Button
          type="button"
          variant="outline"
          aria-haspopup="listbox"
          :aria-label="label"
          :aria-expanded="isOpen"
          :aria-controls="listboxId"
          :disabled="disabled"
          class="w-full min-w-0 justify-between font-normal"
        >
          <span
            class="truncate"
            :class="selectedOptions.length ? 'text-foreground' : 'text-muted-foreground'"
          >
            {{
              selectedOptions.length
                ? selectedOptions.map((option) => option.label).join(', ')
                : placeholder
            }}
          </span>
          <ChevronsUpDown class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-(--reka-popover-trigger-width) min-w-64 space-y-2 p-2" align="start">
        <div class="relative">
          <Search
            class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref="searchInput"
            v-model="query"
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            :aria-label="label"
            :aria-controls="listboxId"
            :aria-expanded="isOpen"
            :aria-activedescendant="activeOptionId"
            :placeholder="searchPlaceholder"
            class="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent py-1 pr-3 pl-8 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            @keydown="handleSearchKeydown"
          />
        </div>
        <div
          v-if="visibleOptions.length"
          :id="listboxId"
          class="max-h-56 overflow-auto"
          role="listbox"
          aria-multiselectable="true"
          :aria-label="label"
        >
          <button
            v-for="(option, optionIndex) in visibleOptions"
            :id="getOptionId(option)"
            :key="option.value"
            type="button"
            role="option"
            :aria-selected="selectedValues.includes(option.value)"
            :disabled="option.disabled"
            tabindex="-1"
            class="focus-visible:ring-ring flex w-full min-w-0 items-start gap-2 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50"
            :class="optionIndex === highlightedIndex ? 'bg-accent text-accent-foreground' : ''"
            @mouseenter="highlightOption(optionIndex)"
            @mousedown.prevent
            @click="toggleOption(option)"
          >
            <span
              class="mt-0.5 grid size-4 shrink-0 place-content-center rounded border border-input"
              :class="
                selectedValues.includes(option.value)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : ''
              "
            >
              <Check
                v-if="selectedValues.includes(option.value)"
                class="size-3"
                aria-hidden="true"
              />
            </span>
            <span class="min-w-0">
              <span class="block break-words font-medium">{{ option.label }}</span>
              <span
                v-if="option.description"
                class="block break-words text-xs text-muted-foreground"
                >{{ option.description }}</span
              >
            </span>
          </button>
        </div>
        <p v-else class="px-2 py-3 text-sm text-muted-foreground" role="status">
          {{ emptyLabel }}
        </p>
        <Button
          v-if="selectedValues.length"
          type="button"
          variant="ghost"
          size="sm"
          class="w-full"
          @click="clearSelection"
        >
          <X class="size-4" aria-hidden="true" />
          {{ clearLabel }}
        </Button>
      </PopoverContent>
    </Popover>

    <div
      v-if="selectedOptions.length"
      class="flex min-w-0 flex-wrap gap-1.5"
      role="list"
      :aria-label="label"
    >
      <button
        v-for="option in selectedOptions"
        :key="option.value"
        type="button"
        class="focus-visible:ring-ring inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border bg-secondary px-2 py-1 text-xs outline-none focus-visible:ring-2"
        :aria-label="`${removeLabel}: ${option.label}`"
        @click="removeOption(option.value)"
      >
        <span class="truncate">{{ option.label }}</span>
        <X class="size-3 shrink-0" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
