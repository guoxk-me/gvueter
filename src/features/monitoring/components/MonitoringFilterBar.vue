<script setup lang="ts">
import type { SearchFormField } from '@/components/admin'
import type { MonitoringFilters } from '@/features/monitoring/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SearchForm } from '@/components/admin'
import {
  DEFAULT_MONITORING_FILTERS,
  MONITORING_LOG_KINDS,
  MONITORING_LOG_SEVERITIES,
} from '@/features/monitoring/types'

defineProps<{ isSearching: boolean }>()

const emit = defineEmits<{
  apply: [filters: MonitoringFilters]
}>()

const searchValues = defineModel<MonitoringFilters>({ required: true })
const { t } = useI18n()
const searchFields = computed<SearchFormField<MonitoringFilters>[]>(() => [
  {
    name: 'keyword',
    label: t('monitoring.filters.keyword'),
    type: 'search',
    placeholder: t('monitoring.filters.keywordPlaceholder'),
  },
  {
    name: 'logKind',
    label: t('monitoring.filters.logKind'),
    type: 'select',
    options: [
      { label: t('monitoring.filters.allKinds'), value: 'all' },
      ...MONITORING_LOG_KINDS.map(kind => ({
        label: t(`monitoring.logKinds.${kind}`),
        value: kind,
      })),
    ],
  },
  {
    name: 'severity',
    label: t('monitoring.filters.severity'),
    type: 'select',
    options: [
      { label: t('monitoring.filters.allSeverities'), value: 'all' },
      ...MONITORING_LOG_SEVERITIES.map(severity => ({
        label: t(`monitoring.severities.${severity}`),
        value: severity,
      })),
    ],
  },
])
</script>

<template>
  <SearchForm
    v-model="searchValues"
    :fields="searchFields"
    :default-values="{ ...DEFAULT_MONITORING_FILTERS }"
    :search-label="t('common.search')"
    :reset-label="t('common.reset')"
    :is-searching="isSearching"
    @search="emit('apply', $event)"
    @reset="emit('apply', $event)"
  />
</template>
