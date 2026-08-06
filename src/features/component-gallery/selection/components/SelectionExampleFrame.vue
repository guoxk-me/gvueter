<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{
  id: string
  sequence: string
  title: string
  description: string
  scenario: string
  contract: string
  states: readonly string[]
  accessibility: string
  limitation: string
  maturity: string
  testStatus: string
  metadataLabels: {
    scenario: string
    contract: string
    accessibility: string
    limitation: string
    maturity: string
    testStatus: string
    states: string
  }
}>()

defineSlots<{
  default: () => unknown
}>()
</script>

<template>
  <!-- AI modified: selection demos expose their business and accessibility contracts next to the interaction. -->
  <section :id="id" class="scroll-mt-24" :aria-labelledby="`${id}-title`">
    <Card class="min-w-0 overflow-hidden">
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
          <div
            class="flex min-w-0 max-w-full flex-wrap gap-1.5"
            :aria-label="metadataLabels.states"
          >
            <Badge v-for="state in states" :key="state" variant="outline" :title="state">
              {{ state }}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent class="space-y-5">
        <slot />
        <dl
          class="grid min-w-0 gap-3 rounded-lg border border-dashed bg-muted/20 p-3 text-xs leading-5 sm:grid-cols-2 xl:grid-cols-3"
        >
          <div class="min-w-0">
            <dt class="font-semibold text-foreground">
              {{ metadataLabels.scenario }}
            </dt>
            <dd class="break-words text-muted-foreground">
              {{ scenario }}
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="font-semibold text-foreground">
              {{ metadataLabels.contract }}
            </dt>
            <dd class="break-words text-muted-foreground">
              {{ contract }}
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="font-semibold text-foreground">
              {{ metadataLabels.accessibility }}
            </dt>
            <dd class="break-words text-muted-foreground">
              {{ accessibility }}
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="font-semibold text-foreground">
              {{ metadataLabels.limitation }}
            </dt>
            <dd class="break-words text-muted-foreground">
              {{ limitation }}
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="font-semibold text-foreground">
              {{ metadataLabels.maturity }}
            </dt>
            <dd class="break-words text-muted-foreground">
              {{ maturity }}
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="font-semibold text-foreground">
              {{ metadataLabels.testStatus }}
            </dt>
            <dd class="break-words text-muted-foreground">
              {{ testStatus }}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  </section>
</template>
