<script setup lang="ts">
import type { WorkflowStep } from './workflow-stepper'
import { Check } from '@lucide/vue'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    steps: readonly WorkflowStep[]
    clickable?: boolean
  }>(),
  {
    clickable: false,
  },
)

const currentStep = defineModel<number>({ default: 0 })
const boundedCurrentStep = computed(() =>
  Math.min(Math.max(currentStep.value, 0), props.steps.length - 1),
)

function getStepState(index: number): 'complete' | 'current' | 'upcoming' {
  if (index < boundedCurrentStep.value) return 'complete'
  if (index === boundedCurrentStep.value) return 'current'
  return 'upcoming'
}

function selectStep(index: number): void {
  if (props.clickable) currentStep.value = index
}
</script>

<template>
  <ol class="flex flex-col gap-3 sm:flex-row sm:gap-0">
    <li
      v-for="(step, index) in props.steps"
      :key="step.id"
      class="relative flex min-w-0 flex-1 items-start gap-3 sm:flex-col sm:items-center sm:text-center"
    >
      <span
        v-if="index > 0"
        class="absolute top-4 right-1/2 hidden h-px w-full -translate-y-1/2 bg-border sm:block"
      />
      <button
        type="button"
        class="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none"
        :class="{
          'border-primary bg-primary text-primary-foreground': getStepState(index) === 'current',
          'border-success bg-success text-success-foreground': getStepState(index) === 'complete',
          'border-border bg-background text-muted-foreground': getStepState(index) === 'upcoming',
        }"
        :disabled="!clickable"
        :aria-current="getStepState(index) === 'current' ? 'step' : undefined"
        @click="selectStep(index)"
      >
        <Check v-if="getStepState(index) === 'complete'" class="size-4" aria-hidden="true" />
        <span v-else>{{ index + 1 }}</span>
      </button>
      <div class="min-w-0 pt-1 sm:pt-2">
        <p class="text-sm font-medium text-foreground">
          {{ step.title }}
        </p>
        <p v-if="step.description" class="mt-0.5 text-xs text-muted-foreground">
          {{ step.description }}
        </p>
      </div>
    </li>
  </ol>
</template>
