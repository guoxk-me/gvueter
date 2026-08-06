<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { StatusTone } from './business-components'
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    label: string
    tone?: StatusTone
    dot?: boolean
    class?: HTMLAttributes['class']
  }>(),
  {
    tone: 'neutral',
    dot: true,
  },
)

const toneClass = computed(
  () =>
    ({
      destructive: 'border-destructive/35 bg-destructive/10 text-destructive',
      neutral: 'border-border bg-muted text-muted-foreground',
      primary: 'border-primary/35 bg-primary/10 text-primary',
      secondary: 'border-border bg-secondary text-secondary-foreground',
      success: 'border-success/35 bg-success/10 text-success',
      warning: 'border-warning/35 bg-warning/10 text-warning',
    })[props.tone],
)

const dotClass = computed(
  () =>
    ({
      destructive: 'bg-destructive',
      neutral: 'bg-muted-foreground',
      primary: 'bg-primary',
      secondary: 'bg-secondary-foreground',
      success: 'bg-success',
      warning: 'bg-warning',
    })[props.tone],
)
</script>

<template>
  <Badge variant="outline" :class="cn(toneClass, props.class)">
    <span v-if="dot" class="size-1.5 rounded-full" :class="dotClass" aria-hidden="true" />
    {{ label }}
  </Badge>
</template>
