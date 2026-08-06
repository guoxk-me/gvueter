<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import type { SearchableSelectOption } from '@/components/admin'
import type { DictionaryOption } from '@/features/dictionaries/types'
import type { UserRole } from '@/features/users/types'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { DictSelect, RoleSelector, SearchableSelect, UserSelector } from '@/components/admin'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import MultiSelectField from './MultiSelectField.vue'

const { locale } = useI18n()
const copy = computed(() =>
  locale.value.startsWith('zh')
    ? {
        ordinary: '普通 Select',
        ordinaryPlaceholder: '选择工单优先级',
        searchable: 'SearchableSelect',
        searchablePlaceholder: '选择发布环境',
        searchableInput: '搜索发布环境',
        empty: '没有匹配选项',
        clear: '清除选择',
        multiple: 'MultiSelect',
        multiplePlaceholder: '选择所需能力',
        multipleInput: '搜索能力',
        clearAll: '清除全部能力',
        remove: '移除能力',
        user: 'UserSelector · 负责人',
        role: 'RoleSelector · 默认角色',
        dictionary: 'DictSelect · 发布状态',
        summary: '当前受控值',
        values: {
          low: '低',
          medium: '中',
          high: '高',
          production: '生产环境',
          staging: '预发布环境',
          development: '开发环境',
          vue: 'Vue',
          accessibility: '无障碍',
          security: '安全治理',
          analytics: '数据分析',
          draft: '草稿',
          published: '已发布',
          archived: '已归档（不可选）',
        },
      }
    : {
        ordinary: 'Ordinary Select',
        ordinaryPlaceholder: 'Choose ticket priority',
        searchable: 'SearchableSelect',
        searchablePlaceholder: 'Choose a release environment',
        searchableInput: 'Search release environments',
        empty: 'No matching options',
        clear: 'Clear selection',
        multiple: 'MultiSelect',
        multiplePlaceholder: 'Choose required capabilities',
        multipleInput: 'Search capabilities',
        clearAll: 'Clear all capabilities',
        remove: 'Remove capability',
        user: 'UserSelector · owner',
        role: 'RoleSelector · default role',
        dictionary: 'DictSelect · release status',
        summary: 'Current controlled values',
        values: {
          low: 'Low',
          medium: 'Medium',
          high: 'High',
          production: 'Production',
          staging: 'Staging',
          development: 'Development',
          vue: 'Vue',
          accessibility: 'Accessibility',
          security: 'Security governance',
          analytics: 'Analytics',
          draft: 'Draft',
          published: 'Published',
          archived: 'Archived (unavailable)',
        },
      },
)

const priority = shallowRef('medium')
const environment = shallowRef<string | null>(null)
const capabilities = shallowRef<string[]>(['accessibility'])
const selectedUserId = shallowRef<number>()
const selectedRole = shallowRef<UserRole>()
const releaseStatus = shallowRef<string>()

const environmentOptions = computed<readonly SearchableSelectOption[]>(() => [
  { value: 'production', label: copy.value.values.production, keywords: ['prod', 'critical'] },
  { value: 'staging', label: copy.value.values.staging, keywords: ['pre-release', 'qa'] },
  { value: 'development', label: copy.value.values.development, keywords: ['dev', 'local'] },
])
const capabilityOptions = computed(() => [
  { value: 'vue', label: copy.value.values.vue, description: 'Composition API' },
  { value: 'accessibility', label: copy.value.values.accessibility, description: 'WCAG · ARIA' },
  { value: 'security', label: copy.value.values.security, description: 'Policy · audit' },
  { value: 'analytics', label: copy.value.values.analytics, description: 'Metrics · reporting' },
])
const dictionaryOptions = computed<readonly DictionaryOption[]>(() => [
  { value: 'draft', label: copy.value.values.draft, color: 'secondary', isDisabled: false },
  { value: 'published', label: copy.value.values.published, color: 'success', isDisabled: false },
  { value: 'archived', label: copy.value.values.archived, color: 'warning', isDisabled: true },
])
const selectedSummary = computed(() =>
  JSON.stringify(
    {
      priority: priority.value,
      environment: environment.value,
      capabilities: capabilities.value,
      userId: selectedUserId.value ?? null,
      role: selectedRole.value ?? null,
      releaseStatus: releaseStatus.value ?? null,
    },
    null,
    2,
  ),
)

function choosePriority(nextPriority: AcceptableValue): void {
  if (typeof nextPriority === 'string') priority.value = nextPriority
}
</script>

<template>
  <div class="grid min-w-0 gap-5 xl:grid-cols-2">
    <fieldset class="min-w-0 space-y-4 rounded-lg border bg-muted/15 p-4">
      <legend class="px-1 text-sm font-semibold">
        {{ copy.ordinary }} · {{ copy.searchable }} · {{ copy.multiple }}
      </legend>

      <div class="min-w-0 space-y-1.5">
        <label class="text-xs font-medium" for="selection-priority-trigger">{{
          copy.ordinary
        }}</label>
        <Select :model-value="priority" @update:model-value="choosePriority">
          <SelectTrigger id="selection-priority-trigger" class="w-full" :aria-label="copy.ordinary">
            <SelectValue :placeholder="copy.ordinaryPlaceholder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">
              {{ copy.values.low }}
            </SelectItem>
            <SelectItem value="medium">
              {{ copy.values.medium }}
            </SelectItem>
            <SelectItem value="high">
              {{ copy.values.high }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="min-w-0 space-y-1.5">
        <p class="text-xs font-medium">
          {{ copy.searchable }}
        </p>
        <SearchableSelect
          v-model="environment"
          :options="environmentOptions"
          :label="copy.searchable"
          :placeholder="copy.searchablePlaceholder"
          :search-placeholder="copy.searchableInput"
          :empty-label="copy.empty"
          :clear-label="copy.clear"
          clearable
        />
      </div>

      <div class="min-w-0 space-y-1.5">
        <p class="text-xs font-medium">
          {{ copy.multiple }}
        </p>
        <MultiSelectField
          v-model="capabilities"
          :options="capabilityOptions"
          :label="copy.multiple"
          :placeholder="copy.multiplePlaceholder"
          :search-placeholder="copy.multipleInput"
          :empty-label="copy.empty"
          :clear-label="copy.clearAll"
          :remove-label="copy.remove"
        />
      </div>
    </fieldset>

    <fieldset class="min-w-0 space-y-4 rounded-lg border bg-muted/15 p-4">
      <legend class="px-1 text-sm font-semibold">User · Role · Dict</legend>
      <div class="min-w-0 space-y-1.5">
        <p class="text-xs font-medium">
          {{ copy.user }}
        </p>
        <UserSelector v-model="selectedUserId" :label="copy.user" />
      </div>
      <div class="min-w-0 space-y-1.5">
        <p class="text-xs font-medium">
          {{ copy.role }}
        </p>
        <RoleSelector v-model="selectedRole" :label="copy.role" />
      </div>
      <div class="min-w-0 space-y-1.5">
        <p id="selection-dictionary-label" class="text-xs font-medium">
          {{ copy.dictionary }}
        </p>
        <DictSelect
          v-model="releaseStatus"
          code="release_status"
          :options="dictionaryOptions"
          :label="copy.dictionary"
        />
      </div>
    </fieldset>

    <div class="min-w-0 rounded-lg border border-dashed bg-muted/20 p-3 xl:col-span-2">
      <p class="text-xs font-semibold">
        {{ copy.summary }}
      </p>
      <pre
        data-testid="identity-selection-summary"
        class="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs text-muted-foreground"
        >{{ selectedSummary }}</pre
      >
    </div>
  </div>
</template>
