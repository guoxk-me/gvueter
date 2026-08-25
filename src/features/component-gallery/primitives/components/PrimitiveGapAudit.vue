<script setup lang="ts">
import type {
  PrimitiveExamplesCopy,
  PrimitiveGapDecision,
  PrimitiveGapDecisionStatus,
} from '../primitive-examples'
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const props = defineProps<{
  copy: PrimitiveExamplesCopy
  decisions: readonly PrimitiveGapDecision[]
}>()

const decisionSummary = computed(() => {
  const deferredCount = props.decisions.filter(decision => decision.status === 'defer').length
  const notApplicableCount = props.decisions.length - deferredCount

  return props.copy.gaps.summary
    .replace('{deferred}', String(deferredCount))
    .replace('{notApplicable}', String(notApplicableCount))
})

function decisionLabel(status: PrimitiveGapDecisionStatus): string {
  return status === 'defer' ? props.copy.gaps.defer : props.copy.gaps.notApplicable
}
</script>

<template>
  <section
    class="min-w-0 space-y-3 rounded-xl border bg-card p-4 shadow-sm sm:p-5"
    aria-labelledby="primitive-gap-audit-title"
    data-testid="primitive-gap-audit"
  >
    <div class="flex min-w-0 flex-wrap items-end justify-between gap-3">
      <div class="min-w-0 space-y-1">
        <h2 id="primitive-gap-audit-title" class="break-words text-lg font-semibold">
          {{ copy.sections.gapsTitle }}
        </h2>
        <p id="primitive-gap-audit-description" class="break-words text-sm text-muted-foreground">
          {{ copy.sections.gapsDescription }}
        </p>
      </div>
      <Badge variant="secondary">
        {{ decisionSummary }}
      </Badge>
    </div>

    <!-- AI modified: explicit decisions prevent missing primitives from silently becoming a component-count backlog. -->
    <div class="min-w-0 rounded-lg border">
      <Table aria-describedby="primitive-gap-audit-description">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">
              Primitive
            </TableHead>
            <TableHead scope="col">
              {{ copy.gaps.statusLabel }}
            </TableHead>
            <TableHead scope="col" class="min-w-64">
              {{ copy.gaps.reasonLabel }}
            </TableHead>
            <TableHead scope="col" class="min-w-64">
              {{ copy.gaps.alternativeLabel }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="decision in decisions"
            :key="decision.id"
            :data-primitive-gap-decision="decision.id"
          >
            <TableCell class="font-medium" translate="no">
              {{ decision.name }}
            </TableCell>
            <TableCell>
              <Badge :variant="decision.status === 'defer' ? 'secondary' : 'outline'">
                {{ decisionLabel(decision.status) }}
              </Badge>
            </TableCell>
            <TableCell class="whitespace-normal break-words text-muted-foreground">
              {{ decision.reason }}
            </TableCell>
            <TableCell class="whitespace-normal break-words text-muted-foreground">
              {{ decision.alternative }}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </section>
</template>
