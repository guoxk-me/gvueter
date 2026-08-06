<script setup lang="ts">
import type { Component } from 'vue'
import type { DashboardQuickAction } from '@/features/dashboard/types'
import { Blocks, ShieldCheck, UserRound, Users } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{
  actions: DashboardQuickAction[]
}>()

const { t } = useI18n()
const actionIcons: Record<DashboardQuickAction['id'], Component> = {
  components: Blocks,
  profile: UserRound,
  roles: ShieldCheck,
  users: Users,
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-base">
        {{ t('dashboard.quickActions.title') }}
      </CardTitle>
      <CardDescription>{{ t('dashboard.quickActions.description') }}</CardDescription>
    </CardHeader>
    <CardContent class="grid gap-3 sm:grid-cols-2">
      <RouterLink
        v-for="action in actions"
        :key="action.id"
        :to="action.to"
        class="group flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
        >
          <component :is="actionIcons[action.id]" class="size-4" aria-hidden="true" />
        </span>
        <span class="min-w-0">
          <span
            class="block text-sm font-medium text-foreground group-hover:text-accent-foreground"
          >
            {{ t(action.labelKey) }}
          </span>
          <span class="mt-0.5 block text-xs text-muted-foreground">
            {{ t(action.descriptionKey) }}
          </span>
        </span>
      </RouterLink>
    </CardContent>
  </Card>
</template>
