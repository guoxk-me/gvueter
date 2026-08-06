<script setup lang="ts">
import type { TableExampleScenario, TableExamplesCopy } from './table-examples'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{
  scenario: TableExampleScenario
  copy: TableExamplesCopy
}>()

defineSlots<{
  default?: () => unknown
  note?: () => unknown
}>()
</script>

<template>
  <Card :data-example-id="scenario.id" class="min-w-0 overflow-hidden">
    <CardHeader class="gap-3">
      <div class="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 space-y-1.5">
          <CardTitle class="break-words text-base">
            {{ copy.scenarios[scenario.id].title }}
          </CardTitle>
          <CardDescription class="break-words">
            {{ copy.scenarios[scenario.id].description }}
          </CardDescription>
        </div>
        <div class="flex shrink-0 flex-wrap gap-1.5" :aria-label="copy.contract.metadata">
          <Badge variant="outline">
            {{ scenario.sharedComponent }}
          </Badge>
          <Badge :variant="scenario.maturity === 'stable' ? 'default' : 'secondary'">
            {{ scenario.maturity }}
          </Badge>
          <Badge variant="outline">
            {{ scenario.testStatus }}
          </Badge>
        </div>
      </div>
    </CardHeader>
    <CardContent class="min-w-0 space-y-4">
      <slot />

      <div
        v-if="$slots.note"
        class="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground"
      >
        <slot name="note" />
      </div>

      <!-- AI modified: support boundaries stay visible beside each runnable example. -->
      <details class="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
        <summary class="cursor-pointer font-medium text-foreground">
          {{ copy.contract.notes }}
        </summary>
        <dl class="mt-2 grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <dt>{{ copy.contract.behavior }}</dt>
          <dd class="break-words">
            {{ scenario.behavior }}
          </dd>
          <dt>{{ copy.contract.accessibility }}</dt>
          <dd class="break-words">
            {{ scenario.accessibility }}
          </dd>
          <dt>{{ copy.contract.limitation }}</dt>
          <dd class="break-words">
            {{ scenario.limitation }}
          </dd>
        </dl>
      </details>
    </CardContent>
  </Card>
</template>
