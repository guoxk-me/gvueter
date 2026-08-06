<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { DateRangePreset, DateRangeValue } from './date-range'
import { parseDate } from '@internationalized/date'
import { CalendarDays, X } from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const props = withDefaults(
  defineProps<{
    presets?: readonly DateRangePreset[]
    label?: string
    placeholder?: string
    startLabel?: string
    endLabel?: string
    applyLabel?: string
    clearLabel?: string
    invalidRangeLabel?: string
    isInvalid?: boolean
    min?: string
    max?: string
  }>(),
  {
    presets: () => [],
    placeholder: 'Select a date range',
    startLabel: 'Start date',
    endLabel: 'End date',
    applyLabel: 'Apply',
    clearLabel: 'Clear',
    invalidRangeLabel: 'The end date must be after the start date.',
    isInvalid: false,
  },
)

const range = defineModel<DateRangeValue | null>({ default: null })
const isOpen = defineModel<boolean>('open', { default: false })
const draftStartDate = ref<DateValue | undefined>(undefined)
const draftEndDate = ref<DateValue | undefined>(undefined)

function parseDateValue(value: string): DateValue | undefined {
  if (!value) return undefined

  try {
    return parseDate(value)
  } catch {
    return undefined
  }
}

const minValue = computed(() => parseDateValue(props.min ?? ''))
const maxValue = computed(() => parseDateValue(props.max ?? ''))

const hasInvalidRange = computed(() =>
  Boolean(
    draftStartDate.value && draftEndDate.value && draftStartDate.value.compare(draftEndDate.value) > 0,
  ),
)
const rangeLabel = computed(() =>
  range.value?.start && range.value.end
    ? `${range.value.start} – ${range.value.end}`
    : props.placeholder,
)
const triggerLabel = computed(() => props.label ?? props.placeholder)

watch(isOpen, (isNowOpen) => {
  if (!isNowOpen) return

  // AI modified: bridge legacy string dates to shadcn Calendar DateValue objects when opening.
  draftStartDate.value = parseDateValue(range.value?.start ?? '')
  draftEndDate.value = parseDateValue(range.value?.end ?? '')
})

function applyRange(): void {
  if (hasInvalidRange.value) return

  // AI modified: preserve existing string-based DateRangeValue API for all integrations.
  range.value =
    draftStartDate.value && draftEndDate.value
      ? {
          start: draftStartDate.value.toString(),
          end: draftEndDate.value.toString(),
        }
      : null
  isOpen.value = false
}

function clearRange(): void {
  draftStartDate.value = undefined
  draftEndDate.value = undefined
  range.value = null
  isOpen.value = false
}

function choosePreset(preset: DateRangePreset): void {
  // AI modified: convert preset strings into calendar objects only inside picker-local draft state.
  draftStartDate.value = parseDateValue(preset.value.start)
  draftEndDate.value = parseDateValue(preset.value.end)
}
</script>

<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <!-- AI modified: filter owners can name the date trigger independently from its changing value text. -->
      <Button
        type="button"
        variant="outline"
        class="w-full justify-start text-left font-normal sm:w-64"
        :aria-label="triggerLabel"
        :aria-invalid="isInvalid"
      >
        <CalendarDays class="mr-2 size-4 text-muted-foreground" aria-hidden="true" />
        <span class="truncate" :class="range ? 'text-foreground' : 'text-muted-foreground'">
          {{ rangeLabel }}
        </span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-80 space-y-4" align="start">
      <div v-if="presets.length" class="flex flex-wrap gap-2">
        <Button
          v-for="preset in presets"
          :key="preset.label"
          type="button"
          variant="secondary"
          size="sm"
          @click="choosePreset(preset)"
        >
          {{ preset.label }}
        </Button>
      </div>
      <div class="grid gap-2 text-sm">
        <div>
          <p class="mb-1.5 text-sm text-muted-foreground">{{ startLabel }}</p>
          <Calendar
            v-model="draftStartDate"
            :min-value="minValue"
            :max-value="maxValue"
            class="rounded-lg"
          />
        </div>
        <div>
          <p class="mb-1.5 text-sm text-muted-foreground">{{ endLabel }}</p>
          <Calendar
            v-model="draftEndDate"
            :min-value="minValue"
            :max-value="maxValue"
            class="rounded-lg"
          />
        </div>
      </div>
      <p v-if="hasInvalidRange" class="text-xs text-destructive" role="alert">
        {{ invalidRangeLabel }}
      </p>
      <div class="flex justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" @click="clearRange">
          <X class="mr-1.5 size-4" aria-hidden="true" />
          {{ clearLabel }}
        </Button>
        <Button type="button" size="sm" :disabled="hasInvalidRange" @click="applyRange">
          {{ applyLabel }}
        </Button>
      </div>
    </PopoverContent>
  </Popover>
</template>
