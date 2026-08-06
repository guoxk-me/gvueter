<script setup lang="ts">
import type { ContentAdminTab } from '@/features/content-admin/content-admin-navigation'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Callout, PageHeader } from '@/components/admin'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { canAccess } from '@/lib/ability'
import AnnouncementPanel from './AnnouncementPanel.vue'
import FilePanel from './FilePanel.vue'
import OperationLogPanel from './OperationLogPanel.vue'

const emit = defineEmits<{
  operationLogOptionsReady: [operationLogIds: readonly string[]]
}>()
const { t } = useI18n()
// AI modified: route-owned tab and detail state remain controlled while the workspace keeps domain composition.
const activeTab = defineModel<ContentAdminTab>('activeTab', { default: 'announcements' })
const selectedOperationLogId = defineModel<string | undefined>('selectedOperationLogId')
const canCreateContent = computed(() => canAccess('create', 'Content'))
const canUpdateContent = computed(() => canAccess('update', 'Content'))
const canDeleteContent = computed(() => canAccess('delete', 'Content'))
const canReadOperationLogs = computed(() => canAccess('read', 'AuditLog'))
// AI modified: every Content control derives from its matching CASL action, not Settings access.
const hasContentWriteAccess = computed(
  () => canCreateContent.value || canUpdateContent.value || canDeleteContent.value,
)
watch(
  canReadOperationLogs,
  (hasAccess) => {
    // AI modified: a denied audit deep link falls back before its protected query can mount.
    if (!hasAccess && activeTab.value === 'operation-logs') activeTab.value = 'announcements'
  },
  { immediate: true },
)
</script>

<template>
  <section class="space-y-6">
    <PageHeader :title="t('contentAdmin.title')" :description="t('contentAdmin.description')" />
    <Callout
      v-if="!hasContentWriteAccess"
      :title="t('contentAdmin.readOnlyTitle')"
      :description="t('contentAdmin.readOnlyDescription')"
    />
    <Tabs v-model="activeTab" class="gap-5">
      <!-- AI modified: one route keeps related administration discoverable while each tab retains an isolated domain API. -->
      <TabsList class="h-auto w-full justify-start overflow-x-auto sm:w-fit">
        <TabsTrigger value="announcements">
          {{ t('contentAdmin.tabs.announcements') }}
        </TabsTrigger>
        <TabsTrigger value="files">
          {{ t('contentAdmin.tabs.files') }}
        </TabsTrigger>
        <TabsTrigger v-if="canReadOperationLogs" value="operation-logs">
          {{ t('contentAdmin.tabs.operationLogs') }}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="announcements">
        <AnnouncementPanel
          :can-create="canCreateContent"
          :can-update="canUpdateContent"
          :can-delete="canDeleteContent"
        />
      </TabsContent>
      <TabsContent value="files">
        <FilePanel :can-upload="canCreateContent" :can-delete="canDeleteContent" />
      </TabsContent>
      <TabsContent v-if="canReadOperationLogs" value="operation-logs">
        <OperationLogPanel
          v-model:selected-operation-log-id="selectedOperationLogId"
          @operation-log-options-ready="emit('operationLogOptionsReady', $event)"
        />
      </TabsContent>
    </Tabs>
  </section>
</template>
