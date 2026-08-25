<script setup lang="ts">
import type { ComponentCenterModuleDefinition } from '../component-center-modules'
import { ArrowRight } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { componentCatalog } from '../component-catalog'
import { componentCenterModules } from '../component-center-modules'

interface ComponentModuleSummary {
  definition: ComponentCenterModuleDefinition
  componentCount: number
  missingDemoCount: number
  enhancementCount: number
}

const { t } = useI18n()

const moduleSummaries = computed<ComponentModuleSummary[]>(() =>
  componentCenterModules.map((definition: ComponentCenterModuleDefinition) => {
    const moduleComponents = componentCatalog.filter(component =>
      definition.catalogModules.includes(component.module),
    )

    return {
      definition,
      componentCount: moduleComponents.length,
      missingDemoCount: moduleComponents.filter(
        component => component.availability.demo === 'missing',
      ).length,
      enhancementCount: moduleComponents.filter(
        component => component.availability.enhancement !== 'none',
      ).length,
    }
  }),
)
</script>

<template>
  <section class="space-y-3" aria-labelledby="component-center-modules-title">
    <div class="space-y-1">
      <h2 id="component-center-modules-title" class="text-lg font-semibold">
        {{ t('components.center.moduleNavigationTitle') }}
      </h2>
      <p class="text-sm text-muted-foreground">
        {{ t('components.center.moduleNavigationDescription') }}
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <RouterLink
        v-for="moduleSummary in moduleSummaries"
        :key="moduleSummary.definition.id"
        :to="moduleSummary.definition.path"
        class="group min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Card
          class="h-full gap-4 py-5 shadow-none transition-[border-color,box-shadow] group-hover:border-primary/40 group-hover:shadow-sm"
        >
          <CardHeader class="gap-3 px-5">
            <div class="flex min-w-0 items-start justify-between gap-3">
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
              >
                <component :is="moduleSummary.definition.icon" class="size-5" aria-hidden="true" />
              </div>
              <Badge variant="secondary">
                {{ t('components.center.componentCount', { count: moduleSummary.componentCount }) }}
              </Badge>
            </div>
            <div class="min-w-0 space-y-1">
              <CardTitle class="flex items-center gap-2 text-base">
                <span class="min-w-0 flex-1">{{ t(moduleSummary.definition.titleKey) }}</span>
                <ArrowRight
                  class="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </CardTitle>
              <CardDescription class="text-pretty">
                {{ t(moduleSummary.definition.descriptionKey) }}
              </CardDescription>
            </div>
          </CardHeader>
          <!-- AI modified: the evidence strip exposes module gaps before users enter a route. -->
          <CardContent
            class="mt-auto grid grid-cols-2 gap-px overflow-hidden border-y bg-border p-0 text-xs"
          >
            <div class="bg-card px-5 py-3">
              <span class="block font-medium tabular-nums">{{
                moduleSummary.missingDemoCount
              }}</span>
              <span class="text-muted-foreground">{{
                t('components.center.summary.withoutDemo')
              }}</span>
            </div>
            <div class="bg-card px-5 py-3">
              <span class="block font-medium tabular-nums">{{
                moduleSummary.enhancementCount
              }}</span>
              <span class="text-muted-foreground">{{
                t('components.center.summary.enhancement')
              }}</span>
            </div>
          </CardContent>
        </Card>
      </RouterLink>
    </div>
  </section>
</template>
