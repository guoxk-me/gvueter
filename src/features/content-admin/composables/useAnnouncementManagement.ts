import type {
  AnnouncementInput,
  AnnouncementListResponse,
  AnnouncementRecord,
  AnnouncementStatusInput,
} from '@/features/content-admin/types/announcements'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import {
  ANNOUNCEMENT_LIST_RESPONSE_SCHEMA,
  ANNOUNCEMENT_RECORD_SCHEMA,
} from '@/features/content-admin/content-admin-api-contracts'
import { EMPTY_RESPONSE_SCHEMA } from '@/lib/api-contracts'
import { del, get, post, put } from '@/lib/http'

interface AnnouncementChangeRequest {
  announcement?: AnnouncementRecord
  input: AnnouncementInput
}

const announcementQueryKey = ['announcements'] as const

export function useAnnouncementManagement() {
  const queryClient = useQueryClient()
  const announcementsQuery = useQuery({
    queryKey: announcementQueryKey,
    queryFn: () =>
      get<AnnouncementListResponse>('/announcements', undefined, {
        responseSchema: ANNOUNCEMENT_LIST_RESPONSE_SCHEMA,
      }),
  })
  const saveMutation = useMutation({
    mutationFn: ({ announcement, input }: AnnouncementChangeRequest) =>
      announcement
        ? put<AnnouncementRecord>(`/announcements/${announcement.id}`, input, {
            responseSchema: ANNOUNCEMENT_RECORD_SCHEMA,
          })
        : post<AnnouncementRecord>('/announcements', input, {
            responseSchema: ANNOUNCEMENT_RECORD_SCHEMA,
          }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: announcementQueryKey }),
  })
  const statusMutation = useMutation({
    mutationFn: ({
      announcement,
      input,
    }: {
      announcement: AnnouncementRecord
      input: AnnouncementStatusInput
    }) =>
      put<AnnouncementRecord>(`/announcements/${announcement.id}/status`, input, {
        responseSchema: ANNOUNCEMENT_RECORD_SCHEMA,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: announcementQueryKey }),
  })
  const deleteMutation = useMutation({
    mutationFn: (announcement: AnnouncementRecord) =>
      del<null>(`/announcements/${announcement.id}`, {
        responseSchema: EMPTY_RESPONSE_SCHEMA,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: announcementQueryKey }),
  })

  return {
    announcements: computed(() => announcementsQuery.data.value?.items ?? []),
    queryError: announcementsQuery.error,
    isLoading: announcementsQuery.isPending,
    isSaving: saveMutation.isPending,
    isUpdatingStatus: statusMutation.isPending,
    isDeleting: deleteMutation.isPending,
    saveAnnouncement: saveMutation.mutateAsync,
    updateAnnouncementStatus: statusMutation.mutateAsync,
    deleteAnnouncement: deleteMutation.mutateAsync,
  }
}
