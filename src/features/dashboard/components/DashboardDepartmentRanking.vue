<script setup lang="ts">
import type { DepartmentRankingEntry } from '@/features/dashboard/types'
import { useI18n } from 'vue-i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{
  entries: DepartmentRankingEntry[]
}>()

const { t } = useI18n()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-base">
        {{ t('dashboard.ranking.title') }}
      </CardTitle>
      <CardDescription>{{ t('dashboard.ranking.description') }}</CardDescription>
    </CardHeader>
    <CardContent>
      <ol class="space-y-3">
        <li
          v-for="(entry, index) in entries"
          :key="entry.departmentId"
          class="flex items-center gap-3"
        >
          <span
            class="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
          >
            {{ index + 1 }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="truncate font-medium text-foreground">{{ entry.departmentName }}</span>
              <span class="tabular-nums text-muted-foreground">
                {{ t('dashboard.ranking.activeUsers', { count: entry.activeUsers }) }}
              </span>
            </div>
            <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full bg-primary"
                :style="{
                  width: `${(entry.activeUsers / Math.max(entries[0]?.activeUsers ?? 1, 1)) * 100}%`,
                }"
              />
            </div>
          </div>
        </li>
      </ol>
    </CardContent>
  </Card>
</template>
