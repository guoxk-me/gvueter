<script setup lang="ts">
import type { PaginationState } from '@tanstack/vue-table'
import type { FileUploadEntry, FileUploadRejection, SearchFormField } from '@/components/admin'
import type {
  ContentFileListFilters,
  ContentFileRecord,
} from '@/features/content-admin/types/files'
import { Download, Eye, Trash2, UploadCloud } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import {
  ConfirmAction,
  Dialog,
  isUploadFileTypeAllowed,
  SearchForm,
  StatusTag,
  Upload,
} from '@/components/admin'
import { ProTable } from '@/components/pro-table'
import { createProTableColumnHelper } from '@/components/table-features'
import { Button } from '@/components/ui/button'
import { useFileManagement } from '@/features/content-admin/composables/useFileManagement'
import { isSafeImagePreview } from '@/features/content-admin/content-admin-rules'
import {
  CONTENT_FILE_UPLOAD_RULES,
  getContentFileMimeTypes,
} from '@/features/content-admin/content-file-policy'
import { applyUploadPolicy, useUploadPolicy } from '@/features/uploads'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel, getFileSizeLabel } from '@/lib/display-format'
import { ApiError, download } from '@/lib/http'

defineProps<{
  canUpload: boolean
  canDelete: boolean
}>()

interface ContentFileSearchFilters extends Record<string, string> {
  keyword: string
}

const { locale, t } = useI18n()
const defaultSearchFilters: ContentFileSearchFilters = { keyword: '' }
const searchFilters = shallowRef<ContentFileSearchFilters>({ ...defaultSearchFilters })
const appliedSearchFilters = shallowRef<ContentFileSearchFilters>({ ...defaultSearchFilters })
const pagination = shallowRef<PaginationState>({ pageIndex: 0, pageSize: 10 })
const listFilters = computed<ContentFileListFilters>(() => ({
  keyword: appliedSearchFilters.value.keyword,
  page: pagination.value.pageIndex + 1,
  pageSize: pagination.value.pageSize,
}))
const uploadEntries = ref<FileUploadEntry[]>([])
const isPreviewOpen = shallowRef(false)
const previewUrl = shallowRef('')
const previewName = shallowRef('')
const {
  files,
  total,
  queryError,
  isLoading,
  isUploading,
  isDeleting,
  uploadFiles,
  deleteFile,
  downloadFile,
} = useFileManagement(listFilters)
const {
  policy: uploadPolicy,
  queryError: uploadPolicyError,
  isLoading: isUploadPolicyLoading,
  refresh: refreshUploadPolicy,
} = useUploadPolicy()
const effectiveUploadPolicy = computed(() =>
  uploadPolicy.value ? applyUploadPolicy(uploadPolicy.value, CONTENT_FILE_UPLOAD_RULES) : undefined,
)
const allowedContentMimeTypes = computed(() =>
  getContentFileMimeTypes(effectiveUploadPolicy.value?.allowedExtensions ?? []),
)
const uploadAccept = computed(() => allowedContentMimeTypes.value.join(','))
const isUploadPolicyReady = computed(() => {
  const policy = effectiveUploadPolicy.value
  return Boolean(
    policy && policy.allowedExtensions.length > 0 && allowedContentMimeTypes.value.length > 0,
  )
})
const isUploadDisabled = computed(
  () =>
    isUploading.value
    || isUploadPolicyLoading.value
    || Boolean(uploadPolicyError.value)
    || !isUploadPolicyReady.value,
)
const uploadDescription = computed(() => {
  if (isUploadPolicyLoading.value)
    return t('contentAdmin.files.uploadPolicyLoading')
  if (uploadPolicyError.value)
    return t('contentAdmin.files.uploadPolicyUnavailable')
  const policy = effectiveUploadPolicy.value
  if (!policy || policy.allowedExtensions.length === 0)
    return t('contentAdmin.files.uploadPolicyEmpty')
  return t('contentAdmin.files.uploadPolicyDescription', {
    size: getFileSizeLabel(policy.maxFileSizeBytes, { locale: locale.value }),
    extensions: policy.allowedExtensions.map(extension => `.${extension}`).join(', '),
  })
})
// AI modified: a failed page has no authoritative total and must not force pagination back to page one.
const tableRowCount = computed(() => (queryError.value ? undefined : total.value))
const searchFields = computed<readonly SearchFormField<ContentFileSearchFilters>[]>(() => [
  {
    name: 'keyword',
    type: 'search',
    label: t('contentAdmin.files.search'),
    placeholder: t('contentAdmin.files.search'),
    inputMode: 'search',
  },
])
const columnHelper = createProTableColumnHelper<ContentFileRecord>()
const columns = computed(() => [
  columnHelper.accessor('name', {
    header: t('contentAdmin.files.fields.name'),
    size: 360,
    enableSorting: false,
    meta: {
      label: t('contentAdmin.files.fields.name'),
      textBehavior: 'wrap',
      minWidth: 280,
    },
  }),
  columnHelper.accessor('mimeType', {
    header: t('contentAdmin.files.fields.type'),
    size: 220,
    enableSorting: false,
    meta: {
      label: t('contentAdmin.files.fields.type'),
      textBehavior: 'nowrap',
      minWidth: 180,
    },
  }),
  columnHelper.accessor('size', {
    header: t('contentAdmin.files.fields.size'),
    size: 120,
    enableSorting: false,
    meta: {
      label: t('contentAdmin.files.fields.size'),
      textBehavior: 'nowrap',
      minWidth: 112,
    },
  }),
  columnHelper.accessor('uploadedBy', {
    header: t('contentAdmin.files.fields.uploadedBy'),
    size: 180,
    enableSorting: false,
    meta: {
      label: t('contentAdmin.files.fields.uploadedBy'),
      textBehavior: 'wrap',
      minWidth: 160,
    },
  }),
  columnHelper.display({
    id: 'actions',
    header: t('common.actions'),
    size: 132,
    enableSorting: false,
    enableHiding: false,
    enablePinning: false,
    meta: {
      label: t('common.actions'),
      cellClass: 'justify-end',
      headerClass: 'justify-end',
      textBehavior: 'nowrap',
      minWidth: 120,
    },
  }),
])

onBeforeUnmount(() => revokePreviewUrl())

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : t('errors.networkError')
}

function getFileUploadedAt(timestamp: string): string {
  // AI modified: file metadata uses one explicit locale and timezone contract.
  return getDateTimeLabel(timestamp, {
    locale: locale.value,
    timeZone: ADMIN_DISPLAY_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function getContentFileSize(bytes: number): string {
  return getFileSizeLabel(bytes, { locale: locale.value })
}

function applySearch(filters: ContentFileSearchFilters): void {
  // AI modified: the server query receives only submitted filters and always restarts at page one.
  appliedSearchFilters.value = { ...filters }
  pagination.value = { ...pagination.value, pageIndex: 0 }
}

function isFileAllowedByCurrentPolicy(file: File): boolean {
  const policy = effectiveUploadPolicy.value
  return Boolean(
    policy
    && file.size <= policy.maxFileSizeBytes
    && isUploadFileTypeAllowed(file, {
      accept: uploadAccept.value,
      allowedExtensions: policy.allowedExtensions,
      allowedMimeTypes: allowedContentMimeTypes.value,
    }),
  )
}

function reportUploadRejections(rejections: FileUploadRejection[]): void {
  const policy = effectiveUploadPolicy.value
  if (!policy || rejections.length === 0)
    return
  if (rejections.some(rejection => rejection.reason === 'file-too-large')) {
    toast.error(
      t('contentAdmin.files.uploadTooLarge', {
        size: getFileSizeLabel(policy.maxFileSizeBytes, { locale: locale.value }),
      }),
    )
    return
  }
  if (rejections.some(rejection => rejection.reason === 'invalid-type')) {
    toast.error(t('contentAdmin.files.uploadTypeRejected'))
    return
  }
  toast.error(t('contentAdmin.files.uploadRejected'))
}

async function submitFiles(): Promise<void> {
  if (isUploadDisabled.value || uploadEntries.value.length === 0)
    return
  const validEntries = uploadEntries.value.filter(entry =>
    isFileAllowedByCurrentPolicy(entry.file),
  )
  if (validEntries.length !== uploadEntries.value.length) {
    // AI modified: a refreshed policy invalidates stale selections before the request is attempted.
    uploadEntries.value = validEntries
    toast.error(t('contentAdmin.files.uploadSelectionOutdated'))
    return
  }
  try {
    const uploadOutcome = await uploadFiles(uploadEntries.value.map(entry => entry.file))
    const failedFiles = new Set(uploadOutcome.failedFiles)
    uploadEntries.value = uploadEntries.value.filter(entry => failedFiles.has(entry.file))

    if (uploadOutcome.uploadedFiles.length === 0) {
      toast.error(getErrorMessage(uploadOutcome.firstFailure))
      return
    }

    pagination.value = { ...pagination.value, pageIndex: 0 }
    if (uploadOutcome.failedFiles.length > 0) {
      // AI modified: keep failed files selected and disclose both sides of a partial upload.
      toast.warning(
        t('contentAdmin.files.uploadPartial', {
          uploaded: uploadOutcome.uploadedFiles.length,
          failed: uploadOutcome.failedFiles.length,
        }),
      )
    }
    else {
      toast.success(t('contentAdmin.files.uploadSuccess'))
    }
  }
  catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

async function removeFile(file: ContentFileRecord): Promise<void> {
  try {
    await deleteFile(file)
    toast.success(t('contentAdmin.files.deleteSuccess'))
  }
  catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

async function saveDownload(file: ContentFileRecord): Promise<void> {
  try {
    const downloadedFile = await downloadFile(file)
    const objectUrl = URL.createObjectURL(downloadedFile.blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = downloadedFile.fileName ?? file.name
    anchor.click()
    URL.revokeObjectURL(objectUrl)
  }
  catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

function revokePreviewUrl(): void {
  if (previewUrl.value)
    URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}

async function previewFile(file: ContentFileRecord): Promise<void> {
  if (!isSafeImagePreview(file) || !file.previewUrl)
    return
  try {
    const preview = await download(file.previewUrl.replace(/^\/api/, ''))
    revokePreviewUrl()
    // AI modified: authenticated image bytes become a short-lived object URL only after MIME allow-list checks.
    previewUrl.value = URL.createObjectURL(preview.blob)
    previewName.value = file.name
    isPreviewOpen.value = true
  }
  catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h2 class="font-semibold">
        {{ t('contentAdmin.files.title') }}
      </h2>
      <p class="text-sm text-muted-foreground">
        {{ t('contentAdmin.files.description') }}
      </p>
    </div>

    <div v-if="canUpload" class="rounded-lg border border-border p-4">
      <Upload
        v-model="uploadEntries"
        :accept="uploadAccept"
        :allowed-extensions="effectiveUploadPolicy?.allowedExtensions ?? []"
        :allowed-mime-types="allowedContentMimeTypes"
        :max-files="3"
        :max-size="effectiveUploadPolicy?.maxFileSizeBytes ?? 0"
        :disabled="isUploadDisabled"
        :label="t('contentAdmin.files.uploadLabel')"
        :description="uploadDescription"
        :browse-label="t('contentAdmin.files.browse')"
        :remove-label="t('contentAdmin.files.removeSelection')"
        @rejected="reportUploadRejections"
      />
      <div
        v-if="uploadPolicyError"
        class="mt-3 flex items-center justify-between gap-3 rounded-md border border-destructive/40 p-3 text-sm text-destructive"
        role="alert"
      >
        <span>{{ getErrorMessage(uploadPolicyError) }}</span>
        <Button type="button" variant="outline" size="sm" @click="refreshUploadPolicy">
          {{ t('common.retry') }}
        </Button>
      </div>
      <div class="mt-3 flex justify-end">
        <Button
          type="button"
          :disabled="isUploadDisabled || uploadEntries.length === 0"
          @click="submitFiles"
        >
          <UploadCloud class="size-4" aria-hidden="true" />
          {{ isUploading ? t('contentAdmin.files.uploading') : t('contentAdmin.files.upload') }}
        </Button>
      </div>
    </div>

    <SearchForm
      v-model="searchFilters"
      :fields="searchFields"
      :default-values="defaultSearchFilters"
      :search-label="t('common.search')"
      :reset-label="t('common.reset')"
      :is-searching="isLoading"
      @search="applySearch"
      @reset="applySearch"
    >
      <template #summary>
        {{ t('contentAdmin.files.total', { total }) }}
      </template>
    </SearchForm>

    <p
      v-if="queryError"
      class="rounded-lg border border-destructive/40 p-4 text-sm text-destructive"
      role="alert"
    >
      {{ getErrorMessage(queryError) }}
    </p>
    <!-- AI modified: one server-table contract now owns loading, empty, row layout, and pagination. -->
    <ProTable
      v-model:pagination="pagination"
      :columns="columns"
      :data="files"
      :row-count="tableRowCount"
      :is-loading="isLoading"
      :empty-message="t('contentAdmin.files.empty')"
      :page-size-options="[10, 20, 50, 100]"
      :get-row-id="(file) => file.id"
      :get-row-label="(file) => file.name"
      :enable-column-controls="false"
      :enable-column-ordering="false"
      :enable-column-pinning="false"
      :enable-density="false"
      :enable-fullscreen="false"
      manual-pagination
    >
      <template #cell="{ cell, row }">
        <div v-if="cell.column.id === 'name'" class="min-w-0">
          <p class="break-words font-medium">
            {{ row.original.name }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ getFileUploadedAt(row.original.uploadedAt) }}
          </p>
        </div>
        <StatusTag
          v-else-if="cell.column.id === 'mimeType'"
          :label="row.original.mimeType"
          tone="neutral"
          :dot="false"
        />
        <span v-else-if="cell.column.id === 'size'">
          {{ getContentFileSize(row.original.size) }}
        </span>
        <span v-else-if="cell.column.id === 'uploadedBy'">
          {{ row.original.uploadedBy }}
        </span>
        <div v-else-if="cell.column.id === 'actions'" class="flex w-full justify-end gap-1">
          <Button
            v-if="isSafeImagePreview(row.original)"
            type="button"
            variant="ghost"
            size="icon-sm"
            :aria-label="t('contentAdmin.files.preview')"
            @click="previewFile(row.original)"
          >
            <Eye class="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            :aria-label="t('contentAdmin.files.download')"
            @click="saveDownload(row.original)"
          >
            <Download class="size-4" aria-hidden="true" />
          </Button>
          <ConfirmAction
            v-if="canDelete"
            :title="t('contentAdmin.files.deleteTitle')"
            :description="t('contentAdmin.files.deleteDescription', { name: row.original.name })"
            :trigger-label="t('common.delete')"
            :confirm-label="t('common.delete')"
            :cancel-label="t('common.cancel')"
            confirm-variant="destructive"
            :is-pending="isDeleting"
            @confirm="removeFile(row.original)"
          >
            <template #trigger>
              <Button type="button" variant="ghost" size="icon-sm" :aria-label="t('common.delete')">
                <Trash2 class="size-4 text-destructive" aria-hidden="true" />
              </Button>
            </template>
          </ConfirmAction>
        </div>
      </template>
    </ProTable>

    <Dialog
      v-model:open="isPreviewOpen"
      :title="previewName"
      :description="t('contentAdmin.files.previewDescription')"
      size="lg"
    >
      <img
        v-if="previewUrl"
        :src="previewUrl"
        :alt="previewName"
        class="max-h-[65vh] w-full rounded-lg object-contain"
      >
    </Dialog>
  </div>
</template>
