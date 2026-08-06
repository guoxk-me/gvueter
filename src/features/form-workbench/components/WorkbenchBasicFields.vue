<script setup lang="ts">
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
import { getWorkbenchCities } from '@/features/form-workbench/form-workbench-rules'
import {
  FORM_WORKBENCH_FIELDS,
  WORKBENCH_PROVINCES,
  WORKBENCH_REVIEWERS,
} from '@/features/form-workbench/types'

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

function getInputValue(field: DynamicWorkbenchField): string | number {
  return props.values[field.name]
}

function updateDynamicField(field: DynamicWorkbenchField, event: Event): void {
  const input = event.target as HTMLInputElement | HTMLSelectElement
  if (field.name === 'title') {
    emit('change', { title: input.value })
    return
  }
  if (field.name === 'budget') {
    emit('change', { budget: Number(input.value) || 0 })
    return
  }
  emit('change', { category: input.value as WorkbenchCategory })
}

function updateReviewer(reviewer: WorkbenchReviewer, event: Event): void {
  const isChecked = (event.target as HTMLInputElement).checked
  const reviewers = isChecked
    ? [...new Set([...props.values.reviewers, reviewer])]
    : props.values.reviewers.filter((candidate) => candidate !== reviewer)
  emit('change', { reviewers })
}

function updateProvince(event: Event): void {
  emit('change', {
    province: (event.target as HTMLSelectElement).value as WorkbenchProvince | '',
  })
}
</script>

<template>
  <div class="space-y-6">
    <!-- AI modified: the first field group renders from a typed business schema instead of duplicated markup. -->
    <div class="grid gap-5 md:grid-cols-2">
      <div v-for="field in FORM_WORKBENCH_FIELDS" :key="field.name" class="space-y-2">
        <label :for="`workbench-${field.name}`" class="text-sm font-medium">
          {{ t(field.labelKey) }}
        </label>
        <select
          v-if="field.kind === 'select'"
          :id="`workbench-${field.name}`"
          :value="getInputValue(field)"
          class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
          :disabled="isDisabled"
          :aria-invalid="Boolean(errors[field.name])"
          :aria-describedby="`workbench-${field.name}-message`"
          @change="updateDynamicField(field, $event)"
        >
          <option v-for="option in field.options" :key="option.value" :value="option.value">
            {{ t(option.labelKey) }}
          </option>
        </select>
        <input
          v-else
          :id="`workbench-${field.name}`"
          :value="getInputValue(field)"
          :type="field.kind"
          :min="field.min"
          :placeholder="field.placeholderKey ? t(field.placeholderKey) : undefined"
          class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
          :disabled="isDisabled || (field.name === 'budget' && values.category === 'internal')"
          :aria-invalid="Boolean(errors[field.name])"
          :aria-describedby="`workbench-${field.name}-message`"
          @input="updateDynamicField(field, $event)"
          @blur="field.name === 'title' ? emit('blurTitle') : undefined"
        />
        <!-- AI modified: one stable message node keeps errors and async/linkage status attached to its control. -->
        <p
          :id="`workbench-${field.name}-message`"
          class="text-xs"
          :class="
            errors[field.name]
              ? 'text-destructive'
              : field.name === 'title' && titleAvailability === 'available'
                ? 'text-success'
                : 'text-muted-foreground'
          "
          :role="errors[field.name] ? 'alert' : undefined"
          :aria-live="!errors[field.name] && field.name === 'title' ? 'polite' : undefined"
        >
          <template v-if="errors[field.name]">
            {{ errors[field.name] }}
          </template>
          <template v-else-if="field.name === 'budget' && values.category === 'internal'">
            {{ t('formWorkbench.linkage.internalBudget') }}
          </template>
          <template v-else-if="field.name === 'title' && isCheckingTitle">
            {{ t('formWorkbench.uniqueChecking') }}
          </template>
          <template v-else-if="field.name === 'title' && titleAvailability === 'available'">
            {{ t('formWorkbench.uniqueAvailable') }}
          </template>
        </p>
      </div>
    </div>

    <fieldset
      class="space-y-3"
      :aria-invalid="Boolean(errors.reviewers)"
      aria-describedby="workbench-reviewers-message"
    >
      <legend class="text-sm font-medium">
        {{ t('formWorkbench.fields.reviewers') }}
      </legend>
      <div class="flex flex-wrap gap-4">
        <label
          v-for="reviewer in WORKBENCH_REVIEWERS"
          :key="reviewer"
          class="flex items-center gap-2 text-sm"
        >
          <input
            type="checkbox"
            class="size-4 accent-primary"
            :checked="values.reviewers.includes(reviewer)"
            :disabled="isDisabled"
            aria-describedby="workbench-reviewers-message"
            @change="updateReviewer(reviewer, $event)"
          />
          {{ t(`formWorkbench.reviewers.${reviewer}`) }}
        </label>
      </div>
      <p
        id="workbench-reviewers-message"
        class="text-xs text-destructive"
        :role="errors.reviewers ? 'alert' : undefined"
      >
        {{ errors.reviewers }}
      </p>
    </fieldset>

    <div class="grid gap-5 md:grid-cols-2">
      <div class="space-y-2">
        <label for="workbench-province" class="text-sm font-medium">
          {{ t('formWorkbench.fields.province') }}
        </label>
        <select
          id="workbench-province"
          :value="values.province"
          class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
          :disabled="isDisabled"
          :aria-invalid="Boolean(errors.province)"
          aria-describedby="workbench-province-message"
          @change="updateProvince"
        >
          <option value="">
            {{ t('formWorkbench.fields.selectProvince') }}
          </option>
          <option v-for="province in WORKBENCH_PROVINCES" :key="province" :value="province">
            {{ t(`formWorkbench.provinces.${province}`) }}
          </option>
        </select>
        <p
          id="workbench-province-message"
          class="text-xs text-destructive"
          :role="errors.province ? 'alert' : undefined"
        >
          {{ errors.province }}
        </p>
      </div>
      <div class="space-y-2">
        <label for="workbench-city" class="text-sm font-medium">
          {{ t('formWorkbench.fields.city') }}
        </label>
        <select
          id="workbench-city"
          :value="values.city"
          class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
          :disabled="isDisabled || cities.length === 0"
          :aria-invalid="Boolean(errors.city)"
          aria-describedby="workbench-city-message"
          @change="emit('change', { city: ($event.target as HTMLSelectElement).value })"
        >
          <option value="">
            {{ t('formWorkbench.fields.selectCity') }}
          </option>
          <option v-for="city in cities" :key="city" :value="city">
            {{ t(`formWorkbench.cities.${city}`) }}
          </option>
        </select>
        <p
          id="workbench-city-message"
          class="text-xs text-destructive"
          :role="errors.city ? 'alert' : undefined"
        >
          {{ errors.city }}
        </p>
      </div>
    </div>

    <div class="grid gap-5 md:grid-cols-2">
      <div class="space-y-2">
        <label for="workbench-publish-at" class="text-sm font-medium">
          {{ t('formWorkbench.fields.publishAt') }}
        </label>
        <input
          id="workbench-publish-at"
          :value="values.publishAt"
          type="datetime-local"
          class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
          :disabled="isDisabled"
          :aria-invalid="Boolean(errors.publishAt)"
          aria-describedby="workbench-publish-at-message"
          @input="emit('change', { publishAt: ($event.target as HTMLInputElement).value })"
        />
        <p
          id="workbench-publish-at-message"
          class="text-xs text-destructive"
          :role="errors.publishAt ? 'alert' : undefined"
        >
          {{ errors.publishAt }}
        </p>
      </div>
      <div class="space-y-2">
        <label for="workbench-address" class="text-sm font-medium">
          {{ t('formWorkbench.fields.address') }}
        </label>
        <textarea
          id="workbench-address"
          :value="values.address"
          rows="3"
          class="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 disabled:opacity-50"
          :disabled="isDisabled"
          :aria-invalid="Boolean(errors.address)"
          aria-describedby="workbench-address-message"
          @input="emit('change', { address: ($event.target as HTMLTextAreaElement).value })"
        />
        <p
          id="workbench-address-message"
          class="text-xs text-destructive"
          :role="errors.address ? 'alert' : undefined"
        >
          {{ errors.address }}
        </p>
      </div>
    </div>
  </div>
</template>
