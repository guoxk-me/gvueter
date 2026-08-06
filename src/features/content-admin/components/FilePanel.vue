<script setup lang="ts">
import type { FileUploadEntry, FileUploadRejection } from '@/components/admin'
import type {
  ContentFileListFilters,
  ContentFileRecord,
} from '@/features/content-admin/types/files'
import { Download, Eye, Search, Trash2, UploadCloud } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import {
  ConfirmAction,
  Dialog,
  isUploadFileTypeAllowed,
  Pagination,
  StatusTag,
  Upload,
} from '@/components/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useFileManagement } from '@/features/content-admin/composables/useFileManagement'
import { isSafeImagePreview } from '@/features/content-admin/content-admin-rules'
import {
  CONTENT_FILE_UPLOAD_RULES,
  getContentFileMimeTypes,
} from '@/features/content-admin/content-file-policy'
import { useUploadPolicy } from '@/features/uploads/composables/useUploadPolicy'
import { applyUploadPolicy } from '@/features/uploads/upload-policy'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel, getFileSizeLabel } from '@/lib/display-format'
import { ApiError, download } from '@/lib/http'

defineProps<{
  canUpload: boolean
  canDelete: boolean
}>()
const { locale, t } = useI18n()
const filters = ref<ContentFileListFilters>({ keyword: '', page: 1, pageSize: 10 })
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
} = useFileManagement(filters)
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
    isUploading.value ||
    isUploadPolicyLoading.value ||
    Boolean(uploadPolicyError.value) ||
    !isUploadPolicyReady.value,
)
const uploadDescription = computed(() => {
  if (isUploadPolicyLoading.value) return t('contentAdmin.files.uploadPolicyLoading')
  if (uploadPolicyError.value) return t('contentAdmin.files.uploadPolicyUnavailable')
  const policy = effectiveUploadPolicy.value
  if (!policy || policy.allowedExtensions.length === 0)
    return t('contentAdmin.files.uploadPolicyEmpty')
  return t('contentAdmin.files.uploadPolicyDescription', {
    size: getFileSizeLabel(policy.maxFileSizeBytes, { locale: locale.value }),
    extensions: policy.allowedExtensions.map((extension) => `.${extension}`).join(', '),
  })
})

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

function updateKeyword(keyword: string | number): void {
  filters.value.keyword = String(keyword)
  filters.value.page = 1
}

function isFileAllowedByCurrentPolicy(file: File): boolean {
  const policy = effectiveUploadPolicy.value
  return Boolean(
    policy &&
    file.size <= policy.maxFileSizeBytes &&
    isUploadFileTypeAllowed(file, {
      accept: uploadAccept.value,
      allowedExtensions: policy.allowedExtensions,
      allowedMimeTypes: allowedContentMimeTypes.value,
    }),
  )
}

function reportUploadRejections(rejections: FileUploadRejection[]): void {
  const policy = effectiveUploadPolicy.value
  if (!policy || rejections.length === 0) return
  if (rejections.some((rejection) => rejection.reason === 'file-too-large')) {
    toast.error(
      t('contentAdmin.files.uploadTooLarge', {
        size: getFileSizeLabel(policy.maxFileSizeBytes, { locale: locale.value }),
      }),
    )
    return
  }
  if (rejections.some((rejection) => rejection.reason === 'invalid-type')) {
    toast.error(t('contentAdmin.files.uploadTypeRejected'))
    return
  }
  toast.error(t('contentAdmin.files.uploadRejected'))
}

async function submitFiles(): Promise<void> {
  if (isUploadDisabled.value || uploadEntries.value.length === 0) return
  const validEntries = uploadEntries.value.filter((entry) =>
    isFileAllowedByCurrentPolicy(entry.file),
  )
  if (validEntries.length !== uploadEntries.value.length) {
    // AI modified: a refreshed policy invalidates stale selections before the request is attempted.
    uploadEntries.value = validEntries
    toast.error(t('contentAdmin.files.uploadSelectionOutdated'))
    return
  }
  try {
    const uploadOutcome = await uploadFiles(uploadEntries.value.map((entry) => entry.file))
    const failedFiles = new Set(uploadOutcome.failedFiles)
    uploadEntries.value = uploadEntries.value.filter((entry) => failedFiles.has(entry.file))

    if (uploadOutcome.uploadedFiles.length === 0) {
      toast.error(getErrorMessage(uploadOutcome.firstFailure))
      return
    }

    filters.value.page = 1
    if (uploadOutcome.failedFiles.length > 0) {
      // AI modified: keep failed files selected and disclose both sides of a partial upload.
      toast.warning(
        t('contentAdmin.files.uploadPartial', {
          uploaded: uploadOutcome.uploadedFiles.length,
          failed: uploadOutcome.failedFiles.length,
        }),
      )
    } else toast.success(t('contentAdmin.files.uploadSuccess'))
  } catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

async function removeFile(file: ContentFileRecord): Promise<void> {
  try {
    await deleteFile(file)
    toast.success(t('contentAdmin.files.deleteSuccess'))
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

function revokePreviewUrl(): void {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}

async function previewFile(file: ContentFileRecord): Promise<void> {
  if (!isSafeImagePreview(file) || !file.previewUrl) return
  try {
    const preview = await download(file.previewUrl.replace(/^\/api/, ''))
    revokePreviewUrl()
    // AI modified: authenticated image bytes become a short-lived object URL only after MIME allow-list checks.
    previewUrl.value = URL.createObjectURL(preview.blob)
    previewName.value = file.name
    isPreviewOpen.value = true
  } catch (error: unknown) {
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

    <label class="relative block max-w-md">
      <Search class="absolute left-3 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
      <span class="sr-only">{{ t('contentAdmin.files.search') }}</span>
      <Input
        :model-value="filters.keyword"
        class="pl-9"
        :placeholder="t('contentAdmin.files.search')"
        @update:model-value="updateKeyword"
      />
    </label>

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
            <TableHead>{{ t('contentAdmin.files.fields.name') }}</TableHead>
            <TableHead>{{ t('contentAdmin.files.fields.type') }}</TableHead>
            <TableHead>{{ t('contentAdmin.files.fields.size') }}</TableHead>
            <TableHead>{{ t('contentAdmin.files.fields.uploadedBy') }}</TableHead>
            <TableHead class="text-right">
              {{ t('common.actions') }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isLoading">
            <TableRow v-for="index in 3" :key="index">
              <TableCell v-for="column in 5" :key="column">
                <Skeleton class="h-5" />
              </TableCell>
            </TableRow>
          </template>
          <template v-else-if="files.length">
            <TableRow v-for="file in files" :key="file.id">
              <TableCell>
                <p class="font-medium">
                  {{ file.name }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ getFileUploadedAt(file.uploadedAt) }}
                </p>
              </TableCell>
              <TableCell
                ><StatusTag :label="file.mimeType" tone="neutral" :dot="false"
              /></TableCell>
              <TableCell>{{ getContentFileSize(file.size) }}</TableCell>
              <TableCell>{{ file.uploadedBy }}</TableCell>
              <TableCell>
                <div class="flex justify-end gap-1">
                  <Button
                    v-if="isSafeImagePreview(file)"
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    :aria-label="t('contentAdmin.files.preview')"
                    @click="previewFile(file)"
                  >
                    <Eye class="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    :aria-label="t('contentAdmin.files.download')"
                    @click="saveDownload(file)"
                  >
                    <Download class="size-4" aria-hidden="true" />
                  </Button>
                  <ConfirmAction
                    v-if="canDelete"
                    :title="t('contentAdmin.files.deleteTitle')"
                    :description="t('contentAdmin.files.deleteDescription', { name: file.name })"
                    :trigger-label="t('common.delete')"
                    :confirm-label="t('common.delete')"
                    :cancel-label="t('common.cancel')"
                    confirm-variant="destructive"
                    :is-pending="isDeleting"
                    @confirm="removeFile(file)"
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
          </template>
          <TableRow v-else>
            <TableCell :colspan="5" class="h-24 text-center text-muted-foreground">
              {{ t('contentAdmin.files.empty') }}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
    <Pagination v-model:page="filters.page" v-model:page-size="filters.pageSize" :total="total" />

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
      />
    </Dialog>
  </div>
</template>
