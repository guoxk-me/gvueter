<script setup lang="ts">
import type {
  AnnouncementInput,
  AnnouncementRecord,
} from '@/features/content-admin/types/announcements'
import { Pencil, Plus, Power, Radio, Trash2 } from '@lucide/vue'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { ConfirmAction, StatusTag } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAnnouncementManagement } from '@/features/content-admin/composables/useAnnouncementManagement'
import {
  getAnnouncementTextPreview,
  getPriorityTone,
} from '@/features/content-admin/content-admin-rules'
import { useDictionaryOptions } from '@/features/dictionaries/composables/useDictionaryOptions'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel } from '@/lib/display-format'
import { ApiError } from '@/lib/http'
import AnnouncementDialog from './AnnouncementDialog.vue'

interface AnnouncementPanelProps {
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

const props = defineProps<AnnouncementPanelProps>()
const { locale, t } = useI18n()
const isDialogOpen = shallowRef(false)
const editingAnnouncement = shallowRef<AnnouncementRecord>()
const { options: priorityOptions } = useDictionaryOptions('announcement_priority')
const {
  announcements,
  queryError,
  isLoading,
  isSaving,
  isUpdatingStatus,
  isDeleting,
  saveAnnouncement,
  updateAnnouncementStatus,
  deleteAnnouncement,
} = useAnnouncementManagement()
const statusTones = {
  draft: 'neutral',
  published: 'success',
  offline: 'warning',
} as const
const hasAnnouncements = computed(() => announcements.value.length > 0)
const hasActionColumn = computed(() => props.canUpdate || props.canDelete)

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : t('errors.networkError')
}

function getAnnouncementUpdatedAt(timestamp: string): string {
  // AI modified: announcement timestamps use the active locale and the admin business timezone.
  return getDateTimeLabel(timestamp, {
    locale: locale.value,
    timeZone: ADMIN_DISPLAY_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function createAnnouncement(): void {
  editingAnnouncement.value = undefined
  isDialogOpen.value = true
}

function editAnnouncement(announcement: AnnouncementRecord): void {
  editingAnnouncement.value = announcement
  isDialogOpen.value = true
}

async function save(input: AnnouncementInput): Promise<void> {
  try {
    await saveAnnouncement({ announcement: editingAnnouncement.value, input })
    isDialogOpen.value = false
    toast.success(t('contentAdmin.announcements.saveSuccess'))
  }
  catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

async function changeStatus(announcement: AnnouncementRecord): Promise<void> {
  const status = announcement.status === 'published' ? 'offline' : 'published'
  try {
    await updateAnnouncementStatus({ announcement, input: { status } })
    toast.success(t(`contentAdmin.announcements.${status}Success`))
  }
  catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

async function remove(announcement: AnnouncementRecord): Promise<void> {
  try {
    await deleteAnnouncement(announcement)
    toast.success(t('contentAdmin.announcements.deleteSuccess'))
  }
  catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h2 class="font-semibold">
          {{ t('contentAdmin.announcements.title') }}
        </h2>
        <p class="text-sm text-muted-foreground">
          {{ t('contentAdmin.announcements.description') }}
        </p>
      </div>
      <Button v-if="canCreate" type="button" @click="createAnnouncement">
        <Plus class="size-4" aria-hidden="true" />
        {{ t('contentAdmin.announcements.create') }}
      </Button>
    </div>
    <p
      v-if="queryError"
      class="rounded-lg border border-destructive/40 p-4 text-sm text-destructive"
      role="alert"
    >
      {{ getErrorMessage(queryError) }}
    </p>
    <div class="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{{ t('contentAdmin.announcements.fields.title') }}</TableHead>
            <TableHead>{{ t('contentAdmin.announcements.fields.priority') }}</TableHead>
            <TableHead>{{ t('contentAdmin.announcements.fields.status') }}</TableHead>
            <TableHead>{{ t('contentAdmin.announcements.fields.updatedAt') }}</TableHead>
            <TableHead v-if="hasActionColumn" class="text-right">
              {{ t('common.actions') }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isLoading">
            <TableRow v-for="index in 3" :key="index">
              <TableCell v-for="column in hasActionColumn ? 5 : 4" :key="column">
                <Skeleton class="h-5" />
              </TableCell>
            </TableRow>
          </template>
          <TableRow
            v-for="announcement in announcements"
            v-else-if="hasAnnouncements"
            :key="announcement.id"
          >
            <TableCell class="max-w-md">
              <p class="font-medium">
                {{ announcement.title }}
              </p>
              <p class="line-clamp-2 text-xs text-muted-foreground">
                {{ getAnnouncementTextPreview(announcement.content) }}
              </p>
            </TableCell>
            <TableCell>
              <StatusTag
                :label="t(`contentAdmin.announcements.priorities.${announcement.priority}`)"
                :tone="getPriorityTone(announcement.priority, priorityOptions)"
              />
            </TableCell>
            <TableCell>
              <StatusTag
                :label="t(`contentAdmin.announcements.statuses.${announcement.status}`)"
                :tone="statusTones[announcement.status]"
              />
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ getAnnouncementUpdatedAt(announcement.updatedAt) }}
            </TableCell>
            <TableCell v-if="hasActionColumn">
              <div class="flex justify-end gap-1">
                <Button
                  v-if="canUpdate"
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  :aria-label="t('common.edit')"
                  @click="editAnnouncement(announcement)"
                >
                  <Pencil class="size-4" aria-hidden="true" />
                </Button>
                <Button
                  v-if="canUpdate"
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  :disabled="isUpdatingStatus"
                  :aria-label="
                    announcement.status === 'published'
                      ? t('contentAdmin.announcements.offline')
                      : t('contentAdmin.announcements.publish')
                  "
                  @click="changeStatus(announcement)"
                >
                  <Power
                    v-if="announcement.status === 'published'"
                    class="size-4"
                    aria-hidden="true"
                  />
                  <Radio v-else class="size-4" aria-hidden="true" />
                </Button>
                <ConfirmAction
                  v-if="canDelete"
                  :title="t('contentAdmin.announcements.deleteTitle')"
                  :description="
                    t('contentAdmin.announcements.deleteDescription', { title: announcement.title })
                  "
                  :trigger-label="t('common.delete')"
                  :confirm-label="t('common.delete')"
                  :cancel-label="t('common.cancel')"
                  confirm-variant="destructive"
                  :is-pending="isDeleting"
                  @confirm="remove(announcement)"
                >
                  <template #trigger>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      :aria-label="t('common.delete')"
                    >
                      <Trash2 class="size-4 text-destructive" aria-hidden="true" />
                    </Button>
                  </template>
                </ConfirmAction>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-else>
            <TableCell
              :colspan="hasActionColumn ? 5 : 4"
              class="h-24 text-center text-muted-foreground"
            >
              {{ t('contentAdmin.announcements.empty') }}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <AnnouncementDialog
      v-model:open="isDialogOpen"
      :announcement="editingAnnouncement"
      :is-saving="isSaving"
      @save="save"
    />
  </div>
</template>
