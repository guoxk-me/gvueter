import type { Ref } from 'vue'
import type {
  ContentFileListFilters,
  ContentFileListResponse,
  ContentFileRecord,
} from '@/features/content-admin/types/files'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import {
  CONTENT_FILE_LIST_RESPONSE_SCHEMA,
  CONTENT_FILE_RECORD_SCHEMA,
} from '@/features/content-admin/content-admin-api-contracts'
import { EMPTY_RESPONSE_SCHEMA } from '@/lib/api-contracts'
import { del, download, get, uploadFileBytes } from '@/lib/http'

const contentFilesQueryKey = ['content-files'] as const

export interface ContentFileUploadOutcome {
  uploadedFiles: ContentFileRecord[]
  failedFiles: File[]
  firstFailure?: unknown
}

export async function uploadContentFiles(files: File[]): Promise<ContentFileUploadOutcome> {
  // AI modified: settle every selected upload so successful files are not hidden by a later failure.
  const uploadResults = await Promise.allSettled(
    files.map(file =>
      uploadFileBytes<ContentFileRecord>('/content-files', file, {
        fileName: file.name,
        responseSchema: CONTENT_FILE_RECORD_SCHEMA,
      }),
    ),
  )
  const uploadedFiles: ContentFileRecord[] = []
  const failedFiles: File[] = []
  let firstFailure: unknown

  uploadResults.forEach((uploadResult, index) => {
    const file = files[index]
    if (!file)
      return
    if (uploadResult.status === 'fulfilled') {
      uploadedFiles.push(uploadResult.value)
    }
    else {
      failedFiles.push(file)
      firstFailure ??= uploadResult.reason
    }
  })

  return { uploadedFiles, failedFiles, firstFailure }
}

export function useFileManagement(filters: Ref<ContentFileListFilters>) {
  const queryClient = useQueryClient()
  const filesQuery = useQuery({
    queryKey: computed(() => [
      ...contentFilesQueryKey,
      filters.value.keyword,
      filters.value.page,
      filters.value.pageSize,
    ]),
    queryFn: () =>
      get<ContentFileListResponse>(
        '/content-files',
        {
          keyword: filters.value.keyword || undefined,
          page: filters.value.page,
          pageSize: filters.value.pageSize,
        },
        {
          responseSchema: CONTENT_FILE_LIST_RESPONSE_SCHEMA,
        },
      ),
  })
  const uploadMutation = useMutation({
    mutationFn: uploadContentFiles,
    // AI modified: refresh the listing after full or partial success so server state always wins.
    onSettled: () => queryClient.invalidateQueries({ queryKey: contentFilesQueryKey }),
  })
  const deleteMutation = useMutation({
    mutationFn: (file: ContentFileRecord) =>
      del<null>(`/content-files/${file.id}`, { responseSchema: EMPTY_RESPONSE_SCHEMA }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: contentFilesQueryKey }),
  })

  return {
    files: computed(() => filesQuery.data.value?.items ?? []),
    total: computed(() => filesQuery.data.value?.total ?? 0),
    queryError: filesQuery.error,
    isLoading: filesQuery.isPending,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    uploadFiles: uploadMutation.mutateAsync,
    deleteFile: deleteMutation.mutateAsync,
    downloadFile: (file: ContentFileRecord) => download(`/content-files/${file.id}/download`),
  }
}
