<script setup lang="ts">
import type { OnlineSession } from '@/features/monitoring/types'
import { LogOut } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ConfirmAction } from '@/components/admin'
import { DataTable } from '@/components/data-table'
import { createDataTableColumnHelper } from '@/components/table-features'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel } from '@/lib/display-format'

const props = defineProps<{
  sessions: OnlineSession[]
  isLoading: boolean
  canManage: boolean
  isTerminating: boolean
  terminatingSessionId?: string
}>()

const emit = defineEmits<{
  terminate: [session: OnlineSession]
}>()

const { t, locale } = useI18n()
const columnHelper = createDataTableColumnHelper<OnlineSession>()
const columns = computed(() => [
  columnHelper.accessor('userName', { header: t('monitoring.sessions.user') }),
  columnHelper.accessor('role', { header: t('monitoring.sessions.role') }),
  columnHelper.accessor('ipAddress', { header: t('monitoring.sessions.ipAddress') }),
  columnHelper.accessor('client', { header: t('monitoring.sessions.client') }),
  columnHelper.accessor('signedInAt', { header: t('monitoring.sessions.signedInAt') }),
  columnHelper.accessor('lastSeenAt', { header: t('monitoring.sessions.lastSeenAt') }),
  ...(props.canManage
    ? [columnHelper.display({ id: 'actions', header: t('common.actions'), enableSorting: false })]
    : []),
])

function getTimeLabel(timestamp: string): string {
  // AI modified: session timestamps use the shared display timezone.
  return getDateTimeLabel(timestamp, {
    locale: locale.value,
    timeZone: ADMIN_DISPLAY_TIME_ZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  })
}
</script>

<template>
  <DataTable
    :columns="columns"
    :data="sessions"
    :is-loading="isLoading"
    :empty-message="t('monitoring.sessions.empty')"
    :get-row-id="(session) => session.id"
  >
    <template #cell="{ cell, row }">
      <div v-if="cell.column.id === 'userName'" class="min-w-40">
        <p class="font-medium">
          {{ row.original.userName }}
        </p>
        <p class="text-xs text-muted-foreground">
          {{ row.original.userIdentifier }}
        </p>
      </div>
      <Badge v-else-if="cell.column.id === 'role'" variant="secondary">
        {{ t(`roles.${row.original.role}`) }}
      </Badge>
      <code v-else-if="cell.column.id === 'ipAddress'" class="text-xs">
        {{ row.original.ipAddress }}
      </code>
      <span v-else-if="cell.column.id === 'client'" class="text-sm text-muted-foreground">
        {{ row.original.client }}
      </span>
      <span v-else-if="cell.column.id === 'signedInAt'">
        {{ getTimeLabel(row.original.signedInAt) }}
      </span>
      <span v-else-if="cell.column.id === 'lastSeenAt'">
        {{ getTimeLabel(row.original.lastSeenAt) }}
      </span>
      <ConfirmAction
        v-else-if="cell.column.id === 'actions'"
        :title="t('monitoring.sessions.terminateTitle')"
        :description="
          t('monitoring.sessions.terminateDescription', { user: row.original.userName })
        "
        :trigger-label="t('monitoring.sessions.terminate')"
        :confirm-label="t('monitoring.sessions.terminate')"
        :cancel-label="t('common.cancel')"
        :pending-label="t('common.loading')"
        confirm-variant="destructive"
        trigger-variant="ghost"
        :is-pending="isTerminating && terminatingSessionId === row.original.id"
        @confirm="emit('terminate', row.original)"
      >
        <template #trigger>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            :disabled="isTerminating"
            :aria-label="t('monitoring.sessions.terminate')"
          >
            <LogOut class="size-4 text-destructive" aria-hidden="true" />
          </Button>
        </template>
      </ConfirmAction>
    </template>
  </DataTable>
</template>
