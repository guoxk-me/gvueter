<script setup lang="ts">
import type {
  CsvExportColumn,
  DetailDescriptionItem,
  FileUploadEntry,
  FileUploadRejection,
} from '@/components/admin'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import {
  CopyButton,
  DetailDescriptions,
  Dialog,
  DictSelect,
  Drawer,
  ExportButton,
  ImageUpload,
  ImportDialog,
  Pagination,
  StatusTag,
  Upload,
} from '@/components/admin'
import { Button } from '@/components/ui/button'
import ComponentDemoCard from './ComponentDemoCard.vue'
import ComponentsSelectionDisplayDemo from './ComponentsSelectionDisplayDemo.vue'

interface ExportRecord {
  id: string
  owner: string
  status: string
}

const { t } = useI18n()
const currentPage = shallowRef(2)
const currentPageSize = shallowRef(10)
const selectedStatus = shallowRef<string>()
const isDialogOpen = shallowRef(false)
const isDrawerOpen = shallowRef(false)
const isImportOpen = shallowRef(false)
const attachments = shallowRef<FileUploadEntry[]>([])
const images = shallowRef<FileUploadEntry[]>([])

const detailItems = computed<readonly DetailDescriptionItem[]>(() => [
  {
    key: 'account',
    label: t('components.business.account'),
    value: 'OPS-2026-0713',
    copyable: true,
  },
  { key: 'owner', label: t('components.business.owner'), value: 'Avery Chen' },
  {
    key: 'status',
    label: t('components.business.currentStatus'),
    value: t('components.business.active'),
    tone: 'success',
  },
  { key: 'createdAt', label: t('components.business.createdAt'), value: '2026-07-13 09:30' },
])
const exportRecords: readonly ExportRecord[] = [
  { id: 'OPS-001', owner: 'Avery Chen', status: 'active' },
  { id: 'OPS-002', owner: 'Jordan Wu', status: 'pending' },
]
const exportColumns = computed<readonly CsvExportColumn<ExportRecord>[]>(() => [
  { label: 'ID', getValue: (record) => record.id },
  { label: t('components.business.owner'), getValue: (record) => record.owner },
  { label: t('components.business.currentStatus'), getValue: (record) => record.status },
])

function reportRejectedFiles(rejections: FileUploadRejection[]): void {
  const rejection = rejections[0]
  if (!rejection) return

  const messageKeys = {
    duplicate: 'components.upload.duplicate',
    'file-too-large': 'components.upload.fileTooLarge',
    // AI modified: surface unsafe filenames rejected by the shared upload policy.
    'invalid-file-name': 'components.upload.invalidFileName',
    'invalid-type': 'components.upload.invalidType',
    'max-files': 'components.upload.maxFiles',
  } as const
  toast.error(t(messageKeys[rejection.reason], { count: rejections.length }))
}

function selectImportFile(file: File): void {
  toast.success(t('components.business.importSelected', { name: file.name }))
  isImportOpen.value = false
}
</script>

<template>
  <div class="grid gap-4 xl:grid-cols-2">
    <ComponentDemoCard
      :title="t('components.business.pagingTitle')"
      :description="t('components.business.pagingDescription')"
    >
      <Pagination
        v-model:page="currentPage"
        v-model:page-size="currentPageSize"
        :total="128"
        :page-size-options="[10, 20, 50]"
      />
      <template #usage>
        &lt;Pagination v-model:page="page" v-model:page-size="pageSize" :total="total" /&gt;
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="t('components.business.statusTitle')"
      :description="t('components.business.statusDescription')"
    >
      <div class="flex flex-wrap gap-2">
        <StatusTag :label="t('components.business.active')" tone="success" />
        <StatusTag :label="t('components.business.pending')" tone="warning" />
        <StatusTag :label="t('components.business.paused')" tone="destructive" />
      </div>
      <DictSelect
        v-model="selectedStatus"
        code="account_status"
        :placeholder="t('components.business.selectDictionaryValue')"
      />
      <DetailDescriptions :items="detailItems" />
      <template #usage> &lt;DictSelect v-model="status" code="account_status" /&gt; </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="t('components.business.overlayTitle')"
      :description="t('components.business.overlayDescription')"
    >
      <div class="flex flex-wrap gap-2">
        <Button @click="isDialogOpen = true">
          {{ t('components.business.openDialog') }}
        </Button>
        <Button variant="outline" @click="isDrawerOpen = true">
          {{ t('components.business.openDrawer') }}
        </Button>
        <CopyButton
          value="OPS-2026-0713"
          :label="t('components.business.copyValue', { label: 'ID' })"
        />
      </div>

      <Dialog
        v-model:open="isDialogOpen"
        :title="t('components.business.dialogTitle')"
        :description="t('components.business.dialogDescription')"
      >
        <p class="text-sm text-muted-foreground">
          {{ t('components.business.controlledState') }}
        </p>
        <template #footer="{ close }">
          <Button variant="outline" @click="close">
            {{ t('common.close') }}
          </Button>
          <Button @click="close">
            {{ t('common.confirm') }}
          </Button>
        </template>
      </Dialog>

      <Drawer
        v-model:open="isDrawerOpen"
        :title="t('components.business.drawerTitle')"
        :description="t('components.business.drawerDescription')"
      >
        <DetailDescriptions :items="detailItems" :columns="1" :bordered="false" />
      </Drawer>
      <template #usage>
        &lt;Dialog v-model:open="isOpen" title="…" /&gt; · &lt;Drawer v-model:open="isOpen" /&gt;
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="t('components.business.uploadTitle')"
      :description="t('components.business.uploadDescription')"
    >
      <Upload
        v-model="attachments"
        accept=".csv,.pdf"
        :max-files="2"
        @rejected="reportRejectedFiles"
      />
      <ImageUpload v-model="images" :max-files="2" @rejected="reportRejectedFiles" />
      <div class="flex flex-wrap gap-2">
        <Button variant="outline" @click="isImportOpen = true">
          {{ t('components.business.importTitle') }}
        </Button>
        <ExportButton
          :rows="exportRecords"
          :columns="exportColumns"
          file-name="component-center-records.csv"
        />
      </div>
      <ImportDialog
        v-model:open="isImportOpen"
        @import="selectImportFile"
        @rejected="reportRejectedFiles"
      />
      <template #usage>
        &lt;ImportDialog v-model:open="isOpen" @import="submitFile" /&gt;
      </template>
    </ComponentDemoCard>
  </div>
  <ComponentsSelectionDisplayDemo />
</template>
