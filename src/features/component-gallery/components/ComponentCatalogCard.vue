<script setup lang="ts">
import type { ComponentCatalogEntry } from '../component-catalog'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CopyButton } from '@/components/admin'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type CatalogBadgeVariant = 'default' | 'destructive' | 'outline' | 'secondary'

interface AvailabilityRow {
  id: 'demo' | 'enhancement' | 'implementation' | 'test'
  label: string
  status: string
  variant: CatalogBadgeVariant
}

interface ContractSection {
  id: 'events' | 'models' | 'props' | 'slots'
  label: string
  values: readonly string[]
}

const props = defineProps<{
  entry: ComponentCatalogEntry
}>()

const { t } = useI18n()

const availabilityRows = computed<AvailabilityRow[]>(() => [
  {
    id: 'implementation',
    label: t('components.center.availability.implementation'),
    status: t(`components.center.status.implementation.${props.entry.availability.implementation}`),
    variant:
      props.entry.availability.implementation === 'implemented'
        ? 'default'
        : props.entry.availability.implementation === 'partial'
          ? 'secondary'
          : 'destructive',
  },
  {
    id: 'demo',
    label: t('components.center.availability.demo'),
    status: t(`components.center.status.demo.${props.entry.availability.demo}`),
    variant:
      props.entry.availability.demo === 'available'
        ? 'default'
        : props.entry.availability.demo === 'indirect'
          ? 'secondary'
          : 'destructive',
  },
  {
    id: 'test',
    label: t('components.center.availability.test'),
    status: t(`components.center.status.test.${props.entry.availability.test}`),
    variant:
      props.entry.availability.test === 'covered'
        ? 'default'
        : props.entry.availability.test === 'missing'
          ? 'destructive'
          : 'secondary',
  },
  {
    id: 'enhancement',
    label: t('components.center.availability.enhancement'),
    status: t(`components.center.status.enhancement.${props.entry.availability.enhancement}`),
    variant:
      props.entry.availability.enhancement === 'none'
        ? 'outline'
        : props.entry.availability.enhancement === 'required'
          ? 'destructive'
          : 'secondary',
  },
])

const contractSections = computed<ContractSection[]>(() => [
  { id: 'props', label: t('components.center.contract.props'), values: props.entry.contract.props },
  {
    id: 'events',
    label: t('components.center.contract.events'),
    values: props.entry.contract.events,
  },
  { id: 'slots', label: t('components.center.contract.slots'), values: props.entry.contract.slots },
  {
    id: 'models',
    label: t('components.center.contract.models'),
    values: props.entry.contract.models,
  },
])

const evidenceLocations = computed<string[]>(() =>
  [props.entry.sourcePath, ...props.entry.demoLocations].filter(
    (location): location is string => location !== null,
  ),
)

const importCode = computed(() => {
  if (
    !props.entry.sourcePath ||
    props.entry.maturity === 'planned' ||
    !/^[A-Z][A-Za-z0-9]*$/.test(props.entry.displayName)
  ) {
    return null
  }

  const sourceImport = props.entry.sourcePath.replace(/^src\//, '@/').replace(/\.vue$/, '')
  const importStatement =
    props.entry.kind === 'ui-primitive'
      ? `import { ${props.entry.displayName} } from '${sourceImport}'`
      : `import ${props.entry.displayName} from '${sourceImport}'`

  // AI modified: generic catalog cards copy only a valid import instead of inventing unusable required props.
  return importStatement
})
</script>

<template>
  <Card
    :id="`catalog-${entry.id}`"
    :data-component-catalog-entry="entry.id"
    class="min-w-0 gap-4 py-5 shadow-none"
  >
    <CardHeader class="min-w-0 gap-3 px-5">
      <div class="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 space-y-1">
          <CardTitle class="break-words text-base" translate="no">
            {{ entry.displayName }}
          </CardTitle>
          <CardDescription lang="en">
            {{ entry.summary }}
          </CardDescription>
        </div>
        <div class="flex max-w-full flex-wrap gap-2">
          <Badge variant="outline">
            {{ t(`components.center.kind.${entry.kind}`) }}
          </Badge>
          <Badge :variant="entry.maturity === 'stable' ? 'default' : 'secondary'">
            {{ t(`components.center.maturity.${entry.maturity}`) }}
          </Badge>
        </div>
      </div>

      <dl class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="availability in availabilityRows"
          :key="availability.id"
          class="flex min-w-0 items-center justify-between gap-2 rounded-md border bg-muted/25 px-3 py-2"
        >
          <dt class="text-xs text-muted-foreground">
            {{ availability.label }}
          </dt>
          <dd class="min-w-0">
            <Badge :variant="availability.variant" :title="availability.status">
              {{ availability.status }}
            </Badge>
          </dd>
        </div>
      </dl>
    </CardHeader>

    <CardContent class="space-y-4 px-5">
      <section v-if="importCode" class="space-y-2" :aria-labelledby="`${entry.id}-starter-code`">
        <div class="flex min-w-0 items-center justify-between gap-2">
          <h3 :id="`${entry.id}-starter-code`" class="text-sm font-medium">
            {{ t('components.center.sections.starterCode') }}
          </h3>
          <CopyButton
            :value="importCode"
            :label="t('components.center.copyCode')"
            :copied-label="t('common.copied')"
            icon-only
          />
        </div>
        <pre
          class="max-w-full overflow-x-auto rounded-md bg-muted p-3 text-xs"
        ><code translate="no">{{ importCode }}</code></pre>
        <p class="text-xs text-muted-foreground">
          {{ t('components.center.starterCodeHint') }}
        </p>
      </section>

      <section class="space-y-2" :aria-labelledby="`${entry.id}-scenarios`">
        <h3 :id="`${entry.id}-scenarios`" class="text-sm font-medium">
          {{ t('components.center.sections.scenarios') }}
        </h3>
        <ul class="flex flex-wrap gap-2" lang="en">
          <li
            v-for="scenario in entry.businessScenarios"
            :key="scenario"
            class="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
          >
            {{ scenario }}
          </li>
        </ul>
      </section>

      <!-- AI modified: native disclosure sections keep the dense API inventory keyboard-accessible without restoring tab-only navigation. -->
      <div class="divide-y rounded-lg border">
        <details class="group px-3 py-2">
          <summary
            class="cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {{ t('components.center.sections.contract') }}
          </summary>
          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <section
              v-for="contractSection in contractSections"
              :key="contractSection.id"
              class="min-w-0 space-y-1.5"
            >
              <h4 class="text-xs font-medium text-muted-foreground">
                {{ contractSection.label }}
              </h4>
              <div class="flex flex-wrap gap-1.5">
                <code
                  v-for="contractValue in contractSection.values"
                  :key="contractValue"
                  class="max-w-full break-all rounded bg-muted px-1.5 py-0.5 text-xs"
                  translate="no"
                  >{{ contractValue }}</code
                >
                <span
                  v-if="contractSection.values.length === 0"
                  class="text-xs text-muted-foreground"
                >
                  {{ t('components.center.none') }}
                </span>
              </div>
            </section>
          </div>
        </details>

        <details class="group px-3 py-2">
          <summary
            class="cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {{ t('components.center.sections.statesAndLimits') }}
          </summary>
          <div class="mt-3 grid gap-4 lg:grid-cols-2">
            <section class="space-y-1.5">
              <h4 class="text-xs font-medium text-muted-foreground">
                {{ t('components.center.sections.states') }}
              </h4>
              <ul class="list-disc space-y-1 pl-4 text-sm" lang="en">
                <li v-for="state in entry.states" :key="state">
                  {{ state }}
                </li>
              </ul>
            </section>
            <section class="space-y-1.5">
              <h4 class="text-xs font-medium text-muted-foreground">
                {{ t('components.center.sections.limitations') }}
              </h4>
              <ul class="list-disc space-y-1 pl-4 text-sm" lang="en">
                <li v-for="limitation in entry.limitations" :key="limitation">
                  {{ limitation }}
                </li>
              </ul>
            </section>
          </div>
        </details>

        <details class="group px-3 py-2">
          <summary
            class="cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {{ t('components.center.sections.accessibilityAndTests') }}
          </summary>
          <div class="mt-3 grid gap-4 lg:grid-cols-2">
            <section class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-medium text-muted-foreground">
                  {{ t('components.center.sections.accessibility') }}
                </h4>
                <Badge variant="outline">
                  {{ t(`components.center.accessibility.${entry.accessibility.status}`) }}
                </Badge>
              </div>
              <ul class="list-disc space-y-1 pl-4 text-sm" lang="en">
                <li v-for="note in entry.accessibility.notes" :key="note">
                  {{ note }}
                </li>
              </ul>
            </section>
            <section class="space-y-2">
              <h4 class="text-xs font-medium text-muted-foreground">
                {{ t('components.center.sections.testEvidence') }}
              </h4>
              <p class="text-sm" lang="en">
                {{ entry.tests.coverage }}
              </p>
              <ul v-if="entry.tests.locations.length > 0" class="space-y-1.5">
                <li
                  v-for="testLocation in entry.tests.locations"
                  :key="testLocation"
                  class="flex min-w-0 items-center gap-2 rounded bg-muted/50 px-2 py-1"
                >
                  <code class="min-w-0 flex-1 break-all text-xs" translate="no">{{
                    testLocation
                  }}</code>
                  <CopyButton
                    :value="testLocation"
                    :label="t('components.center.copyPath')"
                    :copied-label="t('common.copied')"
                    icon-only
                  />
                </li>
              </ul>
            </section>
          </div>
        </details>

        <details class="group px-3 py-2">
          <summary
            class="cursor-pointer rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {{ t('components.center.sections.evidenceAndRelease') }}
          </summary>
          <div class="mt-3 grid gap-4 lg:grid-cols-2">
            <section class="space-y-2">
              <h4 class="text-xs font-medium text-muted-foreground">
                {{ t('components.center.sections.locations') }}
              </h4>
              <ul class="space-y-1.5">
                <li
                  v-for="location in evidenceLocations"
                  :key="location"
                  class="flex min-w-0 items-center gap-2 rounded bg-muted/50 px-2 py-1"
                >
                  <code class="min-w-0 flex-1 break-all text-xs" translate="no">{{
                    location
                  }}</code>
                  <CopyButton
                    :value="location"
                    :label="t('components.center.copyPath')"
                    :copied-label="t('common.copied')"
                    icon-only
                  />
                </li>
              </ul>
              <div v-if="entry.businessUsages.length > 0" class="space-y-1.5">
                <h4 class="text-xs font-medium text-muted-foreground">
                  {{ t('components.center.sections.businessUsages') }}
                </h4>
                <ul class="list-disc space-y-1 pl-4 text-sm" lang="en">
                  <li v-for="usage in entry.businessUsages" :key="usage">
                    {{ usage }}
                  </li>
                </ul>
              </div>
            </section>
            <section class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-medium text-muted-foreground">
                  {{ t('components.center.sections.release') }}
                </h4>
                <Badge variant="outline" translate="no"> v{{ entry.release.version }} </Badge>
              </div>
              <p class="text-sm" lang="en">
                {{ entry.release.migrationNote }}
              </p>
            </section>
          </div>
        </details>
      </div>
    </CardContent>
  </Card>
</template>
