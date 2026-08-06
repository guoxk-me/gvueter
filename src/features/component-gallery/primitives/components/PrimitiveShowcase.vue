<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getPrimitiveExamplesCopy, getPrimitiveGapDecisions } from '../primitive-examples'
import PrimitiveGapAudit from './PrimitiveGapAudit.vue'
import PrimitiveOverlayExamples from './PrimitiveOverlayExamples.vue'
import PrimitiveStructureExamples from './PrimitiveStructureExamples.vue'

defineProps<{
  primitiveCount: number
}>()

const { locale } = useI18n()
const copy = computed(() => getPrimitiveExamplesCopy(locale.value))
const gapDecisions = computed(() => getPrimitiveGapDecisions(locale.value))
</script>

<template>
  <div id="primitive-foundations" class="min-w-0 space-y-6" data-testid="primitive-showcase">
    <Card class="border-primary/20 bg-primary/3 shadow-sm">
      <CardContent
        class="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="min-w-0 space-y-1">
          <h2 class="break-words text-sm font-semibold">
            {{ copy.coverage.title }}
          </h2>
          <p class="max-w-4xl break-words text-xs leading-5 text-muted-foreground">
            {{ copy.coverage.description }}
          </p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <Badge variant="secondary">
            {{ copy.coverage.directExamples }}
          </Badge>
          <Badge variant="outline">
            {{ copy.coverage.catalogEntries.replace('{count}', String(primitiveCount)) }}
          </Badge>
        </div>
      </CardContent>
    </Card>

    <section class="min-w-0 space-y-3" aria-labelledby="primitive-structure-title">
      <div class="space-y-1">
        <h2 id="primitive-structure-title" class="break-words text-lg font-semibold">
          {{ copy.sections.structureTitle }}
        </h2>
        <p class="break-words text-sm text-muted-foreground">
          {{ copy.sections.structureDescription }}
        </p>
      </div>
      <PrimitiveStructureExamples :copy="copy" />
    </section>

    <section class="min-w-0 space-y-3" aria-labelledby="primitive-overlays-title">
      <div class="space-y-1">
        <h2 id="primitive-overlays-title" class="break-words text-lg font-semibold">
          {{ copy.sections.overlaysTitle }}
        </h2>
        <p class="break-words text-sm text-muted-foreground">
          {{ copy.sections.overlaysDescription }}
        </p>
      </div>
      <PrimitiveOverlayExamples :copy="copy" />
    </section>

    <PrimitiveGapAudit :copy="copy" :decisions="gapDecisions" />
  </div>
</template>
