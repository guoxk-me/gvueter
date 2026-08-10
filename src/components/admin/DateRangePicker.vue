<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { DateRange } from 'reka-ui'
import type { Composer } from 'vue-i18n'
import type { DateRangePreset, DateRangeValue } from './date-range'
import { parseDate } from '@internationalized/date'
import { CalendarDays, X } from '@lucide/vue'
import { computed, shallowRef, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { i18n } from '@/i18n'
import { cn } from '@/lib/utils'

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
// AI modified: the shared locale ref keeps isolated component mounts and application rendering aligned.
const locale = computed(() => (i18n.global as unknown as Composer).locale.value)
// AI modified: internationalized date objects stay opaque so Vue does not unwrap their private fields.
const draftRange = shallowRef<DateRange>({ start: undefined, end: undefined })

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

const hasCompleteRange = computed(() => Boolean(draftRange.value.start && draftRange.value.end))
const hasInvalidRange = computed(() => {
  const { start, end } = draftRange.value
  return Boolean(start && end && start.compare(end) > 0)
})
const isApplyDisabled = computed(() => !hasCompleteRange.value || hasInvalidRange.value)
const dateFormatter = computed(
  () => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeZone: 'UTC' }),
)
const calendarLabel = computed(() => `${props.startLabel} – ${props.endLabel}`)
const rangeLabel = computed(() => {
  const start = parseDateValue(range.value?.start ?? '')
  const end = parseDateValue(range.value?.end ?? '')
  if (!start || !end) return props.placeholder

  // AI modified: date-only values use UTC solely to avoid locale formatting shifting the calendar day.
  return `${dateFormatter.value.format(start.toDate('UTC'))} – ${dateFormatter.value.format(end.toDate('UTC'))}`
})
const triggerLabel = computed(() => props.label ?? props.placeholder)

watch(isOpen, (isNowOpen) => {
  if (!isNowOpen) return

  // AI modified: bridge the public ISO-string contract to one shadcn range-calendar draft.
  draftRange.value = {
    start: parseDateValue(range.value?.start ?? ''),
    end: parseDateValue(range.value?.end ?? ''),
  }
})

function applyRange(): void {
  if (isApplyDisabled.value) return

  const { start, end } = draftRange.value
  if (!start || !end) return

  // AI modified: preserve existing string-based DateRangeValue API for all integrations.
  range.value = {
    start: start.toString(),
    end: end.toString(),
  }
  isOpen.value = false
}

function clearRange(): void {
  draftRange.value = { start: undefined, end: undefined }
  range.value = null
  isOpen.value = false
}

function choosePreset(preset: DateRangePreset): void {
  // AI modified: presets update one atomic range instead of two independently valid calendar fields.
  draftRange.value = {
    start: parseDateValue(preset.value.start),
    end: parseDateValue(preset.value.end),
  }
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
        <CalendarDays data-icon="inline-start" aria-hidden="true" />
        <span :class="cn('truncate', range ? 'text-foreground' : 'text-muted-foreground')">
          {{ rangeLabel }}
        </span>
      </Button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0" align="start" :collision-padding="16">
      <div class="flex flex-col gap-3">
        <div v-if="presets.length" class="flex flex-wrap gap-2 px-3 pt-3">
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
        <RangeCalendar
          v-model="draftRange"
          :calendar-label="calendarLabel"
          :locale="locale"
          :min-value="minValue"
          :max-value="maxValue"
          initial-focus
          class="rounded-lg"
        />
        <p v-if="hasInvalidRange" class="px-3 text-xs text-destructive" role="alert">
          {{ invalidRangeLabel }}
        </p>
        <div class="flex justify-between gap-2 border-t p-3">
          <Button type="button" variant="ghost" size="sm" @click="clearRange">
            <X data-icon="inline-start" aria-hidden="true" />
            {{ clearLabel }}
          </Button>
          <Button type="button" size="sm" :disabled="isApplyDisabled" @click="applyRange">
            {{ applyLabel }}
          </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
