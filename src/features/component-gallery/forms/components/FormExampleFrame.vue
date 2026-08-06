<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{
  id: string
  sequence: string
  title: string
  description: string
  states: readonly string[]
  statesLabel: string
}>()

defineSlots<{
  default: () => unknown
  notes?: () => unknown
}>()
</script>

<template>
  <!-- AI modified: every form demo exposes the same semantic documentation and state contract. -->
  <section :id="id" class="scroll-mt-24" :aria-labelledby="`${id}-title`">
    <Card class="overflow-hidden">
      <CardHeader class="border-b border-border/70 bg-muted/20">
        <div class="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div class="min-w-0 flex-1 space-y-1">
            <p class="font-mono text-[11px] font-semibold tracking-[0.16em] text-primary">
              {{ sequence }}
            </p>
            <CardTitle :id="`${id}-title`" class="break-words text-lg">
              {{ title }}
            </CardTitle>
            <CardDescription class="max-w-3xl break-words">
              {{ description }}
            </CardDescription>
          </div>
          <div class="flex min-w-0 max-w-full flex-wrap gap-1.5" :aria-label="statesLabel">
            <Badge v-for="state in states" :key="state" variant="outline" :title="state">
              {{ state }}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent class="space-y-5">
        <slot />
        <aside
          v-if="$slots.notes"
          class="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground"
        >
          <slot name="notes" />
        </aside>
      </CardContent>
    </Card>
  </section>
</template>
