<script setup lang="ts">
import type {
  CacheHealth,
  MonitoringFilters,
  MonitoringTab,
  OnlineSession,
  ScheduledJob,
} from '@/features/monitoring/types'
import { Activity, ListChecks, ServerCog, TriangleAlert } from '@lucide/vue'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Callout, MetricCard, PageHeader } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMonitoring } from '@/features/monitoring/composables/useMonitoring'
import { DEFAULT_MONITORING_FILTERS } from '@/features/monitoring/types'
import { canAccess } from '@/lib/ability'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel } from '@/lib/display-format'
import { ApiError } from '@/lib/http'
import MonitoringCachesTable from './MonitoringCachesTable.vue'
import MonitoringFilterBar from './MonitoringFilterBar.vue'
import MonitoringJobsTable from './MonitoringJobsTable.vue'
import MonitoringLogsTable from './MonitoringLogsTable.vue'
import MonitoringServicesGrid from './MonitoringServicesGrid.vue'
import MonitoringSessionsTable from './MonitoringSessionsTable.vue'

const { t, locale } = useI18n()
const activeTab = defineModel<MonitoringTab>('activeTab', { default: 'sessions' })
const searchValues = shallowRef<MonitoringFilters>({ ...DEFAULT_MONITORING_FILTERS })
const appliedFilters = shallowRef<MonitoringFilters>({ ...DEFAULT_MONITORING_FILTERS })
const {
  overview,
  queryError,
  isLoading,
  isRefreshing,
  isTerminatingSession,
  isRunningJob,
  isClearingCache,
  terminatingSessionId,
  runningJobId,
  clearingCacheName,
  refreshMonitoring,
  terminateSession,
  runJob,
  clearCache,
} = useMonitoring(appliedFilters)
const canOperate = computed(
  () => overview.value?.accessLevel === 'operator' && canAccess('update', 'Monitoring'),
)
// AI modified: monitoring freshness uses the same business timezone as row-level timestamps.
const generatedAtLabel = computed(() =>
  overview.value
    ? getDateTimeLabel(overview.value.generatedAt, {
        locale: locale.value,
        timeZone: ADMIN_DISPLAY_TIME_ZONE,
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '',
)

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : t('errors.networkError')
}

function applyFilters(filters: MonitoringFilters): void {
  // AI modified: only submitted filter snapshots become Vue Query keys, avoiding a request per keystroke.
  appliedFilters.value = { ...filters }
}

async function terminateOnlineSession(session: OnlineSession): Promise<void> {
  try {
    const hasTerminated = await terminateSession(session.id)
    if (hasTerminated)
      toast.success(t('monitoring.sessions.terminateSuccess'))
  }
  catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

async function runScheduledJob(job: ScheduledJob): Promise<void> {
  try {
    const hasRun = await runJob(job.id)
    if (hasRun)
      toast.success(t('monitoring.jobsTable.runSuccess'))
  }
  catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

async function clearNamedCache(cache: CacheHealth): Promise<void> {
  try {
    const hasCleared = await clearCache(cache.name)
    if (hasCleared)
      toast.success(t('monitoring.cachesTable.clearSuccess'))
  }
  catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader :title="t('monitoring.title')" :description="t('monitoring.description')">
      <template #actions>
        <Button type="button" variant="outline" :disabled="isRefreshing" @click="refreshMonitoring">
          {{ isRefreshing ? t('common.loading') : t('common.refresh') }}
        </Button>
      </template>
    </PageHeader>

    <Callout
      v-if="overview?.accessLevel === 'observer'"
      :title="t('monitoring.observerTitle')"
      :description="t('monitoring.observerDescription')"
    />

    <div
      v-if="queryError"
      class="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
      role="alert"
    >
      <span>{{ getErrorMessage(queryError) }}</span>
      <Button type="button" size="sm" variant="outline" @click="refreshMonitoring">
        {{ t('common.retry') }}
      </Button>
    </div>

    <MonitoringFilterBar
      v-model="searchValues"
      :is-searching="isRefreshing"
      @apply="applyFilters"
    />

    <div v-if="isLoading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
      <Skeleton v-for="metricIndex in 4" :key="metricIndex" class="h-32" />
    </div>

    <template v-else-if="overview">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          :title="t('monitoring.summary.onlineSessions')"
          :value="overview.summary.onlineSessionCount"
          :description="t('monitoring.summary.onlineSessionsHint')"
          :icon="Activity"
        />
        <MetricCard
          :title="t('monitoring.summary.degradedServices')"
          :value="overview.summary.degradedServiceCount"
          :description="t('monitoring.summary.degradedServicesHint')"
          :icon="ServerCog"
          icon-class="bg-warning/10 text-warning"
        />
        <MetricCard
          :title="t('monitoring.summary.failedJobs')"
          :value="overview.summary.failedJobCount"
          :description="t('monitoring.summary.failedJobsHint')"
          :icon="ListChecks"
          icon-class="bg-destructive/10 text-destructive"
        />
        <MetricCard
          :title="t('monitoring.summary.recentErrors')"
          :value="overview.summary.recentErrorCount"
          :description="t('monitoring.summary.recentErrorsHint')"
          :icon="TriangleAlert"
          icon-class="bg-destructive/10 text-destructive"
        />
      </div>

      <!-- AI modified: the route owns the active monitoring surface so shared links and history restore it. -->
      <Tabs v-model="activeTab" class="space-y-4">
        <TabsList class="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="sessions">
            {{ t('monitoring.tabs.sessions') }}
          </TabsTrigger>
          <TabsTrigger value="logs">
            {{ t('monitoring.tabs.logs') }}
          </TabsTrigger>
          <TabsTrigger value="services">
            {{ t('monitoring.tabs.services') }}
          </TabsTrigger>
          <TabsTrigger value="jobs">
            {{ t('monitoring.tabs.jobs') }}
          </TabsTrigger>
          <TabsTrigger value="caches">
            {{ t('monitoring.tabs.caches') }}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <MonitoringSessionsTable
            :sessions="overview.onlineSessions"
            :is-loading="isRefreshing"
            :can-manage="canOperate"
            :is-terminating="isTerminatingSession"
            :terminating-session-id="terminatingSessionId"
            @terminate="terminateOnlineSession"
          />
        </TabsContent>
        <TabsContent value="logs">
          <MonitoringLogsTable :logs="overview.logs" :is-loading="isRefreshing" />
        </TabsContent>
        <TabsContent value="services">
          <MonitoringServicesGrid :services="overview.services" />
        </TabsContent>
        <TabsContent value="jobs">
          <MonitoringJobsTable
            :jobs="overview.jobs"
            :is-loading="isRefreshing"
            :can-manage="canOperate"
            :is-running="isRunningJob"
            :running-job-id="runningJobId"
            @run="runScheduledJob"
          />
        </TabsContent>
        <TabsContent value="caches">
          <MonitoringCachesTable
            :caches="overview.caches"
            :is-loading="isRefreshing"
            :can-manage="canOperate"
            :is-clearing="isClearingCache"
            :clearing-cache-name="clearingCacheName"
            @clear="clearNamedCache"
          />
        </TabsContent>
      </Tabs>

      <p class="text-right text-xs text-muted-foreground">
        {{ t('monitoring.generatedAt', { time: generatedAtLabel }) }}
      </p>
    </template>
  </section>
</template>
