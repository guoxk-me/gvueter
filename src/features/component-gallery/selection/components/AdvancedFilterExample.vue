<script setup lang="ts">
import type { ExampleRegion, ExampleStatus, SelectionFilters } from '../selection-examples'
import type { DateRangePreset, DateRangeValue } from '@/components/admin/date-range'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { DateRangePicker } from '@/components/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSelectionFilterWorkbench } from '../composables/useSelectionFilterWorkbench'
import MultiSelectField from './MultiSelectField.vue'

type AppliedFilterKey = 'dateRange' | 'region' | 'skills' | 'status'

interface AppliedFilterTag {
  key: AppliedFilterKey
  label: string
}

const { locale } = useI18n()
const copy = computed(() =>
  locale.value.startsWith('zh')
    ? {
        status: '状态',
        region: '区域',
        skills: '能力标签',
        dateRange: '活跃日期',
        all: '全部',
        active: '活跃',
        paused: '暂停',
        americas: '美洲',
        asia: '亚洲',
        europe: '欧洲',
        chooseSkills: '选择能力标签',
        searchSkills: '搜索能力标签',
        empty: '没有匹配能力',
        clearSkills: '清除能力标签',
        removeSkill: '移除能力',
        chooseRange: '选择活跃日期范围',
        start: '开始日期',
        end: '结束日期',
        applyRange: '应用日期',
        clearRange: '清除日期',
        invalidRange: '结束日期不能早于开始日期。',
        lastWeek: '上周',
        thisMonth: '本月',
        apply: '应用筛选',
        clear: '清除全部',
        applied: '已应用筛选',
        noApplied: '当前没有筛选条件。',
        removeFilter: '移除筛选',
        schemeTitle: '保存筛选方案',
        schemePlaceholder: '例如：亚太安全团队',
        schemeLabel: '筛选方案名称',
        saveScheme: '保存当前方案',
        savedSchemes: '已保存方案',
        noSchemes: '尚未保存方案。',
        useScheme: '应用方案',
        deleteScheme: '删除方案',
        saveSuccess: '筛选方案已保存到当前浏览器。',
        saveMemoryOnly: '浏览器存储不可用；方案仅在本次打开期间保留。',
        saveMissing: '请输入筛选方案名称。',
        appliedStatus: (count: number) => `已将 ${count} 项筛选同步到 URL。`,
        clearedStatus: '筛选和 URL 状态已清除。',
        url: '可分享 URL 状态',
        skillsValues: {
          vue: 'Vue',
          accessibility: '无障碍',
          security: '安全治理',
          analytics: '数据分析',
        },
      }
    : {
        status: 'Status',
        region: 'Region',
        skills: 'Capability tags',
        dateRange: 'Active date',
        all: 'All',
        active: 'Active',
        paused: 'Paused',
        americas: 'Americas',
        asia: 'Asia',
        europe: 'Europe',
        chooseSkills: 'Choose capability tags',
        searchSkills: 'Search capability tags',
        empty: 'No capabilities match',
        clearSkills: 'Clear capability tags',
        removeSkill: 'Remove capability',
        chooseRange: 'Choose an active date range',
        start: 'Start date',
        end: 'End date',
        applyRange: 'Apply dates',
        clearRange: 'Clear dates',
        invalidRange: 'The end date cannot be earlier than the start date.',
        lastWeek: 'Last week',
        thisMonth: 'This month',
        apply: 'Apply filters',
        clear: 'Clear all',
        applied: 'Applied filters',
        noApplied: 'No filters are currently applied.',
        removeFilter: 'Remove filter',
        schemeTitle: 'Save a filter scheme',
        schemePlaceholder: 'For example, APAC security team',
        schemeLabel: 'Filter scheme name',
        saveScheme: 'Save current scheme',
        savedSchemes: 'Saved schemes',
        noSchemes: 'No schemes have been saved yet.',
        useScheme: 'Apply scheme',
        deleteScheme: 'Delete scheme',
        saveSuccess: 'The filter scheme was saved in this browser.',
        saveMemoryOnly: 'Browser storage is unavailable; the scheme is kept for this visit only.',
        saveMissing: 'Enter a filter scheme name.',
        appliedStatus: (count: number) => `${count} filters were synchronized to the URL.`,
        clearedStatus: 'Filters and URL state were cleared.',
        url: 'Shareable URL state',
        skillsValues: {
          vue: 'Vue',
          accessibility: 'Accessibility',
          security: 'Security governance',
          analytics: 'Analytics',
        },
      },
)

const {
  appliedFilters,
  applyFilters,
  applyScheme,
  clearFilters,
  draftFilters,
  removeAppliedFilter,
  removeScheme,
  route,
  savedSchemes,
  saveCurrentScheme,
  schemeName,
  selectedFilterCount,
  setDraftFilters,
} = useSelectionFilterWorkbench()
const statusMessage = shallowRef('')

const skillOptions = computed(() => [
  { value: 'vue', label: copy.value.skillsValues.vue },
  { value: 'accessibility', label: copy.value.skillsValues.accessibility },
  { value: 'security', label: copy.value.skillsValues.security },
  { value: 'analytics', label: copy.value.skillsValues.analytics },
])
const datePresets = computed<readonly DateRangePreset[]>(() => [
  { label: copy.value.lastWeek, value: { start: '2026-07-06', end: '2026-07-12' } },
  { label: copy.value.thisMonth, value: { start: '2026-07-01', end: '2026-07-31' } },
])
const draftStatus = computed<ExampleStatus>({
  get: () => draftFilters.value.status,
  set: (status) => updateDraft({ ...draftFilters.value, status }),
})
const draftRegion = computed<ExampleRegion>({
  get: () => draftFilters.value.region,
  set: (region) => updateDraft({ ...draftFilters.value, region }),
})
const draftSkills = computed<string[]>({
  get: () => draftFilters.value.skills,
  set: (skills) => updateDraft({ ...draftFilters.value, skills }),
})
const draftDateRange = computed<DateRangeValue | null>({
  get: () => draftFilters.value.dateRange,
  set: (dateRange) => updateDraft({ ...draftFilters.value, dateRange }),
})
const appliedTags = computed<AppliedFilterTag[]>(() => {
  const filters = appliedFilters.value
  const tags: AppliedFilterTag[] = []
  if (filters.status !== 'all')
    tags.push({ key: 'status', label: `${copy.value.status}: ${copy.value[filters.status]}` })
  if (filters.region !== 'all')
    tags.push({ key: 'region', label: `${copy.value.region}: ${copy.value[filters.region]}` })
  if (filters.skills.length > 0) {
    tags.push({
      key: 'skills',
      label: `${copy.value.skills}: ${filters.skills.map((skill) => copy.value.skillsValues[skill as keyof typeof copy.value.skillsValues] ?? skill).join(', ')}`,
    })
  }
  if (filters.dateRange)
    tags.push({
      key: 'dateRange',
      label: `${copy.value.dateRange}: ${filters.dateRange.start} – ${filters.dateRange.end}`,
    })
  return tags
})

function updateDraft(filters: SelectionFilters): void {
  setDraftFilters(filters)
}

function readSelectValue(event: Event): string | undefined {
  return event.currentTarget instanceof HTMLSelectElement ? event.currentTarget.value : undefined
}

function chooseStatus(event: Event): void {
  const status = readSelectValue(event)
  if (status === 'active' || status === 'all' || status === 'paused') draftStatus.value = status
}

function chooseRegion(event: Event): void {
  const region = readSelectValue(event)
  if (region === 'all' || region === 'americas' || region === 'asia' || region === 'europe')
    draftRegion.value = region
}

async function submitFilters(): Promise<void> {
  await applyFilters()
  statusMessage.value = copy.value.appliedStatus(selectedFilterCount.value)
}

async function resetFilters(): Promise<void> {
  await clearFilters()
  statusMessage.value = copy.value.clearedStatus
}

function saveScheme(): void {
  const saveOutcome = saveCurrentScheme()
  // AI modified: feedback distinguishes durable browser storage from the in-memory fallback.
  statusMessage.value =
    saveOutcome === 'saved'
      ? copy.value.saveSuccess
      : saveOutcome === 'memory-only'
        ? copy.value.saveMemoryOnly
        : copy.value.saveMissing
}
</script>

<template>
  <div class="min-w-0 space-y-5">
    <form
      class="grid min-w-0 gap-4 rounded-lg border bg-muted/15 p-4 md:grid-cols-2 xl:grid-cols-4"
      @submit.prevent="submitFilters"
    >
      <div class="min-w-0 space-y-1.5">
        <label for="selection-filter-status" class="text-xs font-medium">{{ copy.status }}</label>
        <select
          id="selection-filter-status"
          :value="draftStatus"
          class="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px]"
          @change="chooseStatus"
        >
          <option value="all">
            {{ copy.all }}
          </option>
          <option value="active">
            {{ copy.active }}
          </option>
          <option value="paused">
            {{ copy.paused }}
          </option>
        </select>
      </div>
      <div class="min-w-0 space-y-1.5">
        <label for="selection-filter-region" class="text-xs font-medium">{{ copy.region }}</label>
        <select
          id="selection-filter-region"
          :value="draftRegion"
          class="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px]"
          @change="chooseRegion"
        >
          <option value="all">
            {{ copy.all }}
          </option>
          <option value="americas">
            {{ copy.americas }}
          </option>
          <option value="asia">
            {{ copy.asia }}
          </option>
          <option value="europe">
            {{ copy.europe }}
          </option>
        </select>
      </div>
      <div class="min-w-0 space-y-1.5">
        <p class="text-xs font-medium">
          {{ copy.skills }}
        </p>
        <MultiSelectField
          v-model="draftSkills"
          :options="skillOptions"
          :label="copy.skills"
          :placeholder="copy.chooseSkills"
          :search-placeholder="copy.searchSkills"
          :empty-label="copy.empty"
          :clear-label="copy.clearSkills"
          :remove-label="copy.removeSkill"
        />
      </div>
      <div class="min-w-0 space-y-1.5">
        <p class="text-xs font-medium">
          {{ copy.dateRange }}
        </p>
        <DateRangePicker
          v-model="draftDateRange"
          :presets="datePresets"
          :label="copy.dateRange"
          :placeholder="copy.chooseRange"
          :start-label="copy.start"
          :end-label="copy.end"
          :apply-label="copy.applyRange"
          :clear-label="copy.clearRange"
          :invalid-range-label="copy.invalidRange"
        />
      </div>
      <div class="flex min-w-0 flex-wrap gap-2 md:col-span-2 xl:col-span-4">
        <Button type="submit">
          {{ copy.apply }}
        </Button>
        <Button type="button" variant="outline" @click="resetFilters">
          {{ copy.clear }}
        </Button>
      </div>
    </form>

    <section class="min-w-0 space-y-2" aria-labelledby="applied-selection-filters-title">
      <div class="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h3 id="applied-selection-filters-title" class="text-sm font-semibold">
          {{ copy.applied }}
        </h3>
        <Badge variant="secondary">
          {{ selectedFilterCount }}
        </Badge>
      </div>
      <div v-if="appliedTags.length" class="flex min-w-0 flex-wrap gap-2">
        <button
          v-for="tag in appliedTags"
          :key="tag.key"
          type="button"
          class="focus-visible:ring-ring inline-flex min-w-0 max-w-full items-center rounded-full border bg-secondary px-2.5 py-1 text-xs outline-none focus-visible:ring-2"
          :aria-label="`${copy.removeFilter}: ${tag.label}`"
          @click="removeAppliedFilter(tag.key)"
        >
          <span class="truncate">{{ tag.label }}</span
          ><span class="ml-1" aria-hidden="true">×</span>
        </button>
      </div>
      <p v-else class="text-xs text-muted-foreground">
        {{ copy.noApplied }}
      </p>
    </section>

    <div class="grid min-w-0 gap-4 xl:grid-cols-2">
      <section
        class="min-w-0 space-y-3 rounded-lg border p-4"
        aria-labelledby="selection-scheme-title"
      >
        <h3 id="selection-scheme-title" class="text-sm font-semibold">
          {{ copy.schemeTitle }}
        </h3>
        <label for="selection-scheme-name" class="sr-only">{{ copy.schemeLabel }}</label>
        <div class="flex min-w-0 flex-col gap-2 sm:flex-row">
          <Input
            id="selection-scheme-name"
            v-model="schemeName"
            maxlength="60"
            :placeholder="copy.schemePlaceholder"
          />
          <Button type="button" class="shrink-0" @click="saveScheme">
            {{ copy.saveScheme }}
          </Button>
        </div>
        <h4 class="text-xs font-semibold">
          {{ copy.savedSchemes }}
        </h4>
        <ul v-if="savedSchemes.length" class="space-y-2">
          <li
            v-for="scheme in savedSchemes"
            :key="scheme.id"
            class="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 p-2"
          >
            <span class="min-w-0 flex-1 truncate text-sm" :title="scheme.name">{{
              scheme.name
            }}</span>
            <span class="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                :aria-label="`${copy.useScheme}: ${scheme.name}`"
                @click="applyScheme(scheme)"
                >{{ copy.useScheme }}</Button
              >
              <Button
                type="button"
                size="sm"
                variant="ghost"
                :aria-label="`${copy.deleteScheme}: ${scheme.name}`"
                @click="removeScheme(scheme.id)"
                >{{ copy.deleteScheme }}</Button
              >
            </span>
          </li>
        </ul>
        <p v-else class="text-xs text-muted-foreground">
          {{ copy.noSchemes }}
        </p>
      </section>

      <section
        class="min-w-0 space-y-2 rounded-lg border border-dashed bg-muted/20 p-4"
        aria-labelledby="selection-url-state-title"
      >
        <h3 id="selection-url-state-title" class="text-sm font-semibold">
          {{ copy.url }}
        </h3>
        <code
          data-testid="selection-filter-url"
          class="block max-w-full break-all rounded bg-background p-3 text-xs"
          >{{ route.fullPath }}</code
        >
      </section>
    </div>

    <p class="sr-only" role="status" aria-live="polite">
      {{ statusMessage }}
    </p>
  </div>
</template>
