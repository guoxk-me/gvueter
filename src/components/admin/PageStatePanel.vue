<script setup lang="ts">
import type { Component } from 'vue'
import type { PageStateKind } from './page-state'
import {
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  GitCompareArrows,
  Inbox,
  LoaderCircle,
  LogIn,
  RefreshCw,
  SearchX,
  ShieldX,
  WifiOff,
} from '@lucide/vue'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { PAGE_STATE_CONTRACTS } from './page-state'

interface PageStatePresentation {
  icon: Component
  iconClass: string
  panelClass: string
}

const props = defineProps<{
  state: PageStateKind
  title: string
  description?: string
  headingLevel?: 1 | 2 | 3
  primaryActionLabel?: string
  secondaryActionLabel?: string
}>()

const emit = defineEmits<{
  primaryAction: []
  secondaryAction: []
}>()

defineSlots<{
  details?: () => unknown
}>()

// AI modified: presentation follows the typed semantic state instead of caller-selected arbitrary tones.
const presentations: Record<PageStateKind, PageStatePresentation> = {
  'ready': {
    icon: CheckCircle2,
    iconClass: 'bg-success/10 text-success',
    panelClass: 'border-success/30 bg-success/5',
  },
  'loading': {
    icon: LoaderCircle,
    iconClass: 'bg-primary/10 text-primary',
    panelClass: 'border-border bg-muted/20',
  },
  'refreshing': {
    icon: RefreshCw,
    iconClass: 'bg-primary/10 text-primary',
    panelClass: 'border-primary/30 bg-primary/5',
  },
  'empty': {
    icon: Inbox,
    iconClass: 'bg-muted text-muted-foreground',
    panelClass: 'border-border bg-muted/20',
  },
  'search-empty': {
    icon: SearchX,
    iconClass: 'bg-muted text-muted-foreground',
    panelClass: 'border-border bg-muted/20',
  },
  'error': {
    icon: CircleAlert,
    iconClass: 'bg-destructive/10 text-destructive',
    panelClass: 'border-destructive/35 bg-destructive/5',
  },
  'fatal-error': {
    icon: CircleAlert,
    iconClass: 'bg-destructive/10 text-destructive',
    panelClass: 'border-destructive/35 bg-destructive/5',
  },
  'offline': {
    icon: WifiOff,
    iconClass: 'bg-warning/10 text-warning',
    panelClass: 'border-warning/35 bg-warning/5',
  },
  'forbidden': {
    icon: ShieldX,
    iconClass: 'bg-destructive/10 text-destructive',
    panelClass: 'border-destructive/35 bg-destructive/5',
  },
  'conflict': {
    icon: GitCompareArrows,
    iconClass: 'bg-warning/10 text-warning',
    panelClass: 'border-warning/35 bg-warning/5',
  },
  'success': {
    icon: CheckCircle2,
    iconClass: 'bg-success/10 text-success',
    panelClass: 'border-success/30 bg-success/5',
  },
  'partial-success': {
    icon: CircleDashed,
    iconClass: 'bg-warning/10 text-warning',
    panelClass: 'border-warning/35 bg-warning/5',
  },
  'session-expired': {
    icon: LogIn,
    iconClass: 'bg-destructive/10 text-destructive',
    panelClass: 'border-destructive/35 bg-destructive/5',
  },
}

const contract = computed(() => PAGE_STATE_CONTRACTS[props.state])
const presentation = computed(() => presentations[props.state])
const liveRole = computed(() =>
  contract.value.announcement === 'assertive'
    ? 'alert'
    : contract.value.announcement === 'polite'
      ? 'status'
      : undefined,
)
const liveMode = computed(() =>
  contract.value.announcement === 'none' ? undefined : contract.value.announcement,
)
const isBusy = computed(() => ['loading', 'refreshing'].includes(props.state))
const headingTag = computed(() => `h${props.headingLevel ?? 3}` as const)
const headingClass = computed(() =>
  props.headingLevel === 1 ? 'text-xl' : props.headingLevel === 2 ? 'text-base' : 'text-sm',
)
</script>

<template>
  <section
    class="flex min-w-0 flex-col items-center rounded-xl border px-5 py-8 text-center"
    :class="presentation.panelClass"
    :data-page-state="state"
    :role="liveRole"
    :aria-live="liveMode"
    :aria-busy="isBusy || undefined"
  >
    <div
      class="mb-4 flex size-11 items-center justify-center rounded-full"
      :class="presentation.iconClass"
    >
      <component
        :is="presentation.icon"
        class="size-5"
        :class="isBusy ? 'animate-spin motion-reduce:animate-none' : undefined"
        aria-hidden="true"
      />
    </div>
    <!-- AI modified: global recovery surfaces can expose a document-level heading without duplicating the panel. -->
    <component
      :is="headingTag"
      class="max-w-full break-words font-semibold text-foreground"
      :class="headingClass"
    >
      {{ title }}
    </component>
    <p v-if="description" class="mt-1 max-w-lg break-words text-sm text-muted-foreground">
      {{ description }}
    </p>
    <div v-if="$slots.details" class="mt-3 max-w-full text-sm text-muted-foreground">
      <slot name="details" />
    </div>
    <div
      v-if="primaryActionLabel || secondaryActionLabel"
      class="mt-4 flex min-w-0 flex-wrap justify-center gap-2"
    >
      <Button v-if="primaryActionLabel" type="button" size="sm" @click="emit('primaryAction')">
        {{ primaryActionLabel }}
      </Button>
      <Button
        v-if="secondaryActionLabel"
        type="button"
        size="sm"
        variant="outline"
        @click="emit('secondaryAction')"
      >
        {{ secondaryActionLabel }}
      </Button>
    </div>
  </section>
</template>
