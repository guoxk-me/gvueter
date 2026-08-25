<script setup lang="ts">
import type { Component } from 'vue'
import type { ComponentCatalogEntry } from '../component-catalog'
import { CircleCheckBig, CircleDashed, FlaskConical, MonitorCheck, Wrench } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Card, CardContent } from '@/components/ui/card'
import { componentCatalog } from '../component-catalog'

interface CatalogMetric {
  id: string
  icon: Component
  label: string
  count: number
}

const { t } = useI18n()
// AI modified: retain the documented status union even when the current literal inventory has no missing implementation.
const documentedCatalog: readonly ComponentCatalogEntry[] = componentCatalog

const catalogMetrics = computed<CatalogMetric[]>(() => [
  {
    id: 'inventory',
    icon: MonitorCheck,
    label: t('components.center.summary.inventory'),
    count: documentedCatalog.length,
  },
  {
    id: 'stable',
    icon: CircleCheckBig,
    label: t('components.center.summary.stable'),
    count: documentedCatalog.filter(component => component.maturity === 'stable').length,
  },
  {
    id: 'without-demo',
    icon: FlaskConical,
    label: t('components.center.summary.withoutDemo'),
    count: documentedCatalog.filter(component => component.availability.demo === 'missing')
      .length,
  },
  {
    id: 'enhancement',
    icon: Wrench,
    label: t('components.center.summary.enhancement'),
    count: documentedCatalog.filter(component => component.availability.enhancement !== 'none')
      .length,
  },
  {
    id: 'missing-implementation',
    icon: CircleDashed,
    label: t('components.center.summary.missingImplementation'),
    count: documentedCatalog.filter(
      component => component.availability.implementation === 'missing',
    ).length,
  },
])
</script>

<template>
  <section
    :aria-label="t('components.center.summary.label')"
    class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5"
  >
    <Card v-for="metric in catalogMetrics" :key="metric.id" class="gap-0 py-0 shadow-none">
      <CardContent class="flex items-center gap-3 p-4">
        <div
          class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
        >
          <component :is="metric.icon" class="size-4" aria-hidden="true" />
        </div>
        <div class="min-w-0">
          <p class="text-2xl font-semibold tabular-nums">
            {{ metric.count }}
          </p>
          <p class="text-sm text-muted-foreground">
            {{ metric.label }}
          </p>
        </div>
      </CardContent>
    </Card>
  </section>
</template>
