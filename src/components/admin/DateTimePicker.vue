<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { HTMLAttributes } from 'vue'
import { parseDate } from '@internationalized/date'
import { CalendarDays, X } from '@lucide/vue'
import { computed, shallowRef, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DateTimeSelection {
  date: DateValue
  time: string
}

const props = withDefaults(
  defineProps<{
    id?: string
    name?: string
    label?: string
    placeholder?: string
    timeLabel?: string
    applyLabel?: string
    clearLabel?: string
    disabled?: boolean
    autocomplete?: string
    ariaInvalid?: boolean
    ariaDescribedby?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    placeholder: 'Select date and time',
    applyLabel: 'Apply',
    clearLabel: 'Clear',
    disabled: false,
    autocomplete: 'off',
    ariaInvalid: false,
  },
)

const dateTime = defineModel<string>({ default: '' })
const isOpen = defineModel<boolean>('open', { default: false })
const { locale } = useI18n()
const generatedId = useId()
const draftDate = shallowRef<DateValue>()
const draftTime = shallowRef('')

const triggerId = computed(() => props.id ?? `date-time-picker-${generatedId}`)
const timeInputId = computed(() => `${triggerId.value}-time`)
const accessibleLabel = computed(() => props.label ?? props.placeholder)
const resolvedTimeLabel = computed(() => props.timeLabel ?? accessibleLabel.value)
const isApplyDisabled = computed(
  () => props.disabled || !draftDate.value || !isValidTime(draftTime.value),
)
const dateTimeFormatter = computed(
  () => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }),
)
const dateTimeLabel = computed(() => {
  const selection = readDateTime(dateTime.value)
  if (!selection)
    return props.placeholder

  const hours = Number(selection.time.slice(0, 2))
  const minutes = Number(selection.time.slice(3, 5))
  const localDateTime = new Date(
    selection.date.year,
    selection.date.month - 1,
    selection.date.day,
    hours,
    minutes,
  )
  return dateTimeFormatter.value.format(localDateTime)
})

function isValidTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function readDateTime(value: string): DateTimeSelection | undefined {
  const match = /^(\d{4}-\d{2}-\d{2})T((?:[01]\d|2[0-3]):[0-5]\d)$/.exec(value)
  const dateSource = match?.[1]
  const time = match?.[2]
  if (!dateSource || !time)
    return undefined

  try {
    return { date: parseDate(dateSource), time }
  }
  catch {
    return undefined
  }
}

watch(
  isOpen,
  (isNowOpen) => {
    if (!isNowOpen)
      return

    const selection = readDateTime(dateTime.value)
    // AI modified: the popover edits a draft so incomplete date/time changes never leak into the form.
    draftDate.value = selection?.date
    draftTime.value = selection?.time ?? ''
  },
  { immediate: true },
)

function updateDraftTime(value: string | number): void {
  draftTime.value = String(value)
}

function applyDateTime(): void {
  if (isApplyDisabled.value || !draftDate.value)
    return

  dateTime.value = `${draftDate.value.toString()}T${draftTime.value}`
  isOpen.value = false
}

function clearDateTime(): void {
  draftDate.value = undefined
  draftTime.value = ''
  dateTime.value = ''
  isOpen.value = false
}
</script>

<template>
  <div
    data-slot="date-time-picker"
    :data-invalid="ariaInvalid || undefined"
    :class="cn('w-full', props.class)"
  >
    <!-- AI modified: the visible trigger owns label/error ARIA while a hidden input preserves form submission. -->
    <input v-if="name" type="hidden" :name="name" :value="dateTime" :disabled="disabled">
    <Popover v-model:open="isOpen">
      <PopoverTrigger as-child>
        <Button
          :id="triggerId"
          type="button"
          variant="outline"
          class="w-full justify-start text-left"
          :disabled="disabled"
          :aria-label="accessibleLabel"
          :aria-invalid="ariaInvalid"
          :aria-describedby="ariaDescribedby"
        >
          <CalendarDays data-icon="inline-start" aria-hidden="true" />
          <span :class="cn('truncate', !dateTime && 'text-muted-foreground')">
            {{ dateTimeLabel }}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0" align="start" :collision-padding="16">
        <div class="flex flex-col gap-3">
          <Calendar
            v-model="draftDate"
            :calendar-label="accessibleLabel"
            :locale="locale"
            initial-focus
            class="rounded-lg"
          />
          <Field class="px-3" :data-invalid="ariaInvalid || undefined">
            <FieldLabel :for="timeInputId">
              {{ resolvedTimeLabel }}
            </FieldLabel>
            <Input
              :id="timeInputId"
              :model-value="draftTime"
              type="time"
              step="60"
              :autocomplete="autocomplete"
              :disabled="disabled"
              :aria-invalid="ariaInvalid"
              :aria-describedby="ariaDescribedby"
              @update:model-value="updateDraftTime"
            />
          </Field>
          <div class="flex justify-between gap-2 px-3 pb-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              :disabled="disabled"
              @click="clearDateTime"
            >
              <X data-icon="inline-start" aria-hidden="true" />
              {{ clearLabel }}
            </Button>
            <Button type="button" size="sm" :disabled="isApplyDisabled" @click="applyDateTime">
              {{ applyLabel }}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  </div>
</template>
