<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import type {
  DynamicWorkbenchField,
  FormWorkbenchErrors,
  FormWorkbenchValues,
  WorkbenchCategory,
  WorkbenchProvince,
  WorkbenchReviewer,
} from '@/features/form-workbench/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { DateTimePicker } from '@/components/admin'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getWorkbenchCities } from '@/features/form-workbench/form-workbench-rules'
import {
  FORM_WORKBENCH_FIELDS,
  WORKBENCH_PROVINCES,
  WORKBENCH_REVIEWERS,
} from '@/features/form-workbench/types'
import { cn } from '@/lib/utils'

const props = defineProps<{
  values: FormWorkbenchValues
  errors: FormWorkbenchErrors
  isDisabled: boolean
  isCheckingTitle: boolean
  titleAvailability: 'unknown' | 'available' | 'unavailable'
}>()

const emit = defineEmits<{
  change: [changes: Partial<FormWorkbenchValues>]
  blurTitle: []
}>()

const { t } = useI18n()
const cities = computed(() => getWorkbenchCities(props.values.province))
const EMPTY_LOCATION_VALUE = '__empty-location__'

function getInputValue(field: DynamicWorkbenchField): string | number {
  return props.values[field.name]
}

function updateDynamicInput(field: DynamicWorkbenchField, value: string | number): void {
  if (field.name === 'title') {
    emit('change', { title: String(value) })
    return
  }
  if (field.name === 'budget') emit('change', { budget: Number(value) || 0 })
}

function updateDynamicSelect(field: DynamicWorkbenchField, value: AcceptableValue): void {
  if (field.name !== 'category' || typeof value !== 'string') return
  emit('change', { category: value as WorkbenchCategory })
}

function updateReviewer(
  reviewer: WorkbenchReviewer,
  checkedState: boolean | 'indeterminate',
): void {
  const reviewers =
    checkedState === true
      ? [...new Set([...props.values.reviewers, reviewer])]
      : props.values.reviewers.filter((candidate) => candidate !== reviewer)
  emit('change', { reviewers })
}

function getLocationSelectValue(value: string): string {
  return value || EMPTY_LOCATION_VALUE
}

function updateProvince(value: AcceptableValue): void {
  if (typeof value !== 'string') return
  emit('change', {
    province: value === EMPTY_LOCATION_VALUE ? '' : (value as WorkbenchProvince),
  })
}

function updateCity(value: AcceptableValue): void {
  if (typeof value !== 'string') return
  emit('change', { city: value === EMPTY_LOCATION_VALUE ? '' : value })
}
</script>

<template>
  <!-- AI modified: shadcn Field primitives now keep labels, disabled state, and validation attached to every control. -->
  <FieldGroup class="gap-6">
    <FieldGroup class="grid gap-5 md:grid-cols-2">
      <Field
        v-for="field in FORM_WORKBENCH_FIELDS"
        :key="field.name"
        :data-invalid="Boolean(errors[field.name]) || undefined"
        :data-disabled="
          isDisabled || (field.name === 'budget' && values.category === 'internal') || undefined
        "
      >
        <FieldLabel :for="`workbench-${field.name}`">
          {{ t(field.labelKey) }}
        </FieldLabel>
        <Select
          v-if="field.kind === 'select'"
          :model-value="getInputValue(field)"
          :name="field.name"
          autocomplete="off"
          :disabled="isDisabled"
          @update:model-value="updateDynamicSelect(field, $event)"
        >
          <SelectTrigger
            :id="`workbench-${field.name}`"
            class="w-full"
            :aria-invalid="Boolean(errors[field.name])"
            :aria-describedby="`workbench-${field.name}-message`"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem
                v-for="option in field.options ?? []"
                :key="option.value"
                :value="option.value"
              >
                {{ t(option.labelKey) }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Input
          v-else
          :id="`workbench-${field.name}`"
          :model-value="getInputValue(field)"
          :name="field.name"
          :type="field.kind"
          :min="field.min"
          autocomplete="off"
          :placeholder="field.placeholderKey ? t(field.placeholderKey) : undefined"
          :disabled="isDisabled || (field.name === 'budget' && values.category === 'internal')"
          :aria-invalid="Boolean(errors[field.name])"
          :aria-describedby="`workbench-${field.name}-message`"
          @update:model-value="updateDynamicInput(field, $event)"
          @blur="field.name === 'title' ? emit('blurTitle') : undefined"
        />
        <FieldError v-if="errors[field.name]" :id="`workbench-${field.name}-message`">
          {{ errors[field.name] }}
        </FieldError>
        <FieldDescription
          v-else
          :id="`workbench-${field.name}-message`"
          :class="cn(field.name === 'title' && titleAvailability === 'available' && 'text-success')"
          :aria-live="field.name === 'title' ? 'polite' : undefined"
        >
          <template v-if="field.name === 'budget' && values.category === 'internal'">
            {{ t('formWorkbench.linkage.internalBudget') }}
          </template>
          <template v-else-if="field.name === 'title' && isCheckingTitle">
            {{ t('formWorkbench.uniqueChecking') }}
          </template>
          <template v-else-if="field.name === 'title' && titleAvailability === 'available'">
            {{ t('formWorkbench.uniqueAvailable') }}
          </template>
        </FieldDescription>
      </Field>
    </FieldGroup>

    <FieldSet
      :aria-invalid="Boolean(errors.reviewers)"
      aria-describedby="workbench-reviewers-message"
    >
      <FieldLegend variant="label">
        {{ t('formWorkbench.fields.reviewers') }}
      </FieldLegend>
      <FieldGroup class="flex-row flex-wrap gap-4">
        <Field
          v-for="reviewer in WORKBENCH_REVIEWERS"
          :key="reviewer"
          orientation="horizontal"
          class="w-auto"
          :data-invalid="Boolean(errors.reviewers) || undefined"
          :data-disabled="isDisabled || undefined"
        >
          <Checkbox
            :id="`workbench-reviewer-${reviewer}`"
            name="reviewers"
            :value="reviewer"
            :model-value="values.reviewers.includes(reviewer)"
            :disabled="isDisabled"
            :aria-invalid="Boolean(errors.reviewers)"
            aria-describedby="workbench-reviewers-message"
            @update:model-value="updateReviewer(reviewer, $event)"
          />
          <FieldLabel :for="`workbench-reviewer-${reviewer}`" class="font-normal">
            {{ t(`formWorkbench.reviewers.${reviewer}`) }}
          </FieldLabel>
        </Field>
      </FieldGroup>
      <FieldError v-if="errors.reviewers" id="workbench-reviewers-message">
        {{ errors.reviewers }}
      </FieldError>
      <FieldDescription v-else id="workbench-reviewers-message" />
    </FieldSet>

    <FieldGroup class="grid gap-5 md:grid-cols-2">
      <Field
        :data-invalid="Boolean(errors.province) || undefined"
        :data-disabled="isDisabled || undefined"
      >
        <FieldLabel for="workbench-province">
          {{ t('formWorkbench.fields.province') }}
        </FieldLabel>
        <Select
          :model-value="getLocationSelectValue(values.province)"
          name="province"
          autocomplete="address-level1"
          :disabled="isDisabled"
          @update:model-value="updateProvince"
        >
          <SelectTrigger
            id="workbench-province"
            class="w-full"
            :aria-invalid="Boolean(errors.province)"
            aria-describedby="workbench-province-message"
          >
            <SelectValue :placeholder="t('formWorkbench.fields.selectProvince')" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem :value="EMPTY_LOCATION_VALUE">
                {{ t('formWorkbench.fields.selectProvince') }}
              </SelectItem>
              <SelectItem v-for="province in WORKBENCH_PROVINCES" :key="province" :value="province">
                {{ t(`formWorkbench.provinces.${province}`) }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldError v-if="errors.province" id="workbench-province-message">
          {{ errors.province }}
        </FieldError>
        <FieldDescription v-else id="workbench-province-message" />
      </Field>
      <Field
        :data-invalid="Boolean(errors.city) || undefined"
        :data-disabled="isDisabled || cities.length === 0 || undefined"
      >
        <FieldLabel for="workbench-city">
          {{ t('formWorkbench.fields.city') }}
        </FieldLabel>
        <Select
          :model-value="getLocationSelectValue(values.city)"
          name="city"
          autocomplete="address-level2"
          :disabled="isDisabled || cities.length === 0"
          @update:model-value="updateCity"
        >
          <SelectTrigger
            id="workbench-city"
            class="w-full"
            :aria-invalid="Boolean(errors.city)"
            aria-describedby="workbench-city-message"
          >
            <SelectValue :placeholder="t('formWorkbench.fields.selectCity')" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem :value="EMPTY_LOCATION_VALUE">
                {{ t('formWorkbench.fields.selectCity') }}
              </SelectItem>
              <SelectItem v-for="city in cities" :key="city" :value="city">
                {{ t(`formWorkbench.cities.${city}`) }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldError v-if="errors.city" id="workbench-city-message">
          {{ errors.city }}
        </FieldError>
        <FieldDescription v-else id="workbench-city-message" />
      </Field>
    </FieldGroup>

    <FieldGroup class="grid gap-5 md:grid-cols-2">
      <Field
        :data-invalid="Boolean(errors.publishAt) || undefined"
        :data-disabled="isDisabled || undefined"
      >
        <FieldLabel for="workbench-publish-at">
          {{ t('formWorkbench.fields.publishAt') }}
        </FieldLabel>
        <DateTimePicker
          id="workbench-publish-at"
          name="publishAt"
          :model-value="values.publishAt"
          autocomplete="off"
          :label="t('formWorkbench.fields.publishAt')"
          :time-label="t('formWorkbench.fields.publishAt')"
          :placeholder="t('formWorkbench.validation.publishAtRequired')"
          :apply-label="t('common.confirm')"
          :clear-label="t('common.reset')"
          :disabled="isDisabled"
          :aria-invalid="Boolean(errors.publishAt)"
          aria-describedby="workbench-publish-at-message"
          @update:model-value="emit('change', { publishAt: $event })"
        />
        <FieldError v-if="errors.publishAt" id="workbench-publish-at-message">
          {{ errors.publishAt }}
        </FieldError>
        <FieldDescription v-else id="workbench-publish-at-message" />
      </Field>
      <Field
        :data-invalid="Boolean(errors.address) || undefined"
        :data-disabled="isDisabled || undefined"
      >
        <FieldLabel for="workbench-address">
          {{ t('formWorkbench.fields.address') }}
        </FieldLabel>
        <Textarea
          id="workbench-address"
          name="address"
          :model-value="values.address"
          rows="3"
          autocomplete="street-address"
          class="min-h-20"
          :disabled="isDisabled"
          :aria-invalid="Boolean(errors.address)"
          aria-describedby="workbench-address-message"
          @update:model-value="emit('change', { address: String($event) })"
        />
        <FieldError v-if="errors.address" id="workbench-address-message">
          {{ errors.address }}
        </FieldError>
        <FieldDescription v-else id="workbench-address-message" />
      </Field>
    </FieldGroup>
  </FieldGroup>
</template>
