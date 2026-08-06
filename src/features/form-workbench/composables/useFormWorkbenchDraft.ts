import type { FormWorkbenchDraft, FormWorkbenchSubmitInput } from '../types'
import { shallowRef } from 'vue'
import { z } from 'zod'
import {
  getBrowserStorage,
  safeStorageDiscard,
  safeStorageGet,
  safeStorageSet,
} from '@/lib/browser-storage'
import { WORKBENCH_CATEGORIES, WORKBENCH_PROVINCES, WORKBENCH_REVIEWERS } from '../types'

/** Legacy unscoped key. It is removed, never restored, because its owner cannot be proven. */
export const FORM_WORKBENCH_DRAFT_KEY = 'admin-form-workbench-draft'
export const FORM_WORKBENCH_DRAFT_DEBOUNCE_MS = 800

const draftValuesSchema = z.object({
  title: z.string(),
  budget: z.number(),
  category: z.enum(WORKBENCH_CATEGORIES),
  reviewers: z.array(z.enum(WORKBENCH_REVIEWERS)),
  province: z.union([z.enum(WORKBENCH_PROVINCES), z.literal('')]),
  city: z.string(),
  publishAt: z.string(),
  activeRange: z.object({ start: z.string(), end: z.string() }).nullable(),
  richContent: z.string(),
  markdown: z.string(),
  address: z.string(),
})
const formWorkbenchDraftSchema: z.ZodType<FormWorkbenchDraft> = z.object({
  version: z.literal(3),
  schemaId: z.literal('form-workbench'),
  principalId: z.string().min(1),
  savedAt: z.string(),
  values: draftValuesSchema,
  attachmentNames: z.array(z.string()),
  imageNames: z.array(z.string()),
})
const versionTwoFormWorkbenchDraftSchema = z.object({
  version: z.literal(2),
  schemaId: z.literal('form-workbench'),
  savedAt: z.string(),
  values: draftValuesSchema,
  attachmentNames: z.array(z.string()),
  imageNames: z.array(z.string()),
})
const legacyFormWorkbenchDraftSchema = z.object({
  version: z.literal(1),
  savedAt: z.string(),
  values: draftValuesSchema,
  attachmentNames: z.array(z.string()),
  imageNames: z.array(z.string()),
})

export function getFormWorkbenchDraftKey(principalId: string): string {
  return `${FORM_WORKBENCH_DRAFT_KEY}:${encodeURIComponent(principalId)}`
}

export function readFormWorkbenchDraft(
  storage: Pick<Storage, 'getItem'> | undefined,
  principalId: string,
): FormWorkbenchDraft | undefined {
  if (!principalId) return undefined
  const storedDraft = safeStorageGet(storage, getFormWorkbenchDraftKey(principalId))
  if (!storedDraft) return undefined

  try {
    const candidate: unknown = JSON.parse(storedDraft)
    const draft = formWorkbenchDraftSchema.safeParse(candidate)
    if (draft.success) return draft.data.principalId === principalId ? draft.data : undefined

    const versionTwoDraft = versionTwoFormWorkbenchDraftSchema.safeParse(candidate)
    if (versionTwoDraft.success) {
      // AI modified: only drafts already stored beneath a principal key can migrate to the owner schema.
      return { ...versionTwoDraft.data, version: 3, principalId }
    }

    const legacyDraft = legacyFormWorkbenchDraftSchema.safeParse(candidate)
    if (!legacyDraft.success) return undefined
    // AI modified: scoped version-one drafts migrate without losing fields or file-result names.
    return {
      version: 3,
      schemaId: 'form-workbench',
      principalId,
      savedAt: legacyDraft.data.savedAt,
      values: legacyDraft.data.values,
      attachmentNames: legacyDraft.data.attachmentNames,
      imageNames: legacyDraft.data.imageNames,
    }
  } catch {
    return undefined
  }
}

export function getFormWorkbenchDraft(
  submission: FormWorkbenchSubmitInput,
  principalId: string,
  savedAt = new Date().toISOString(),
): FormWorkbenchDraft {
  const { attachmentNames, imageNames, ...values } = submission
  return {
    version: 3,
    schemaId: 'form-workbench',
    principalId,
    savedAt,
    values: {
      ...values,
      reviewers: [...values.reviewers],
      activeRange: values.activeRange ? { ...values.activeRange } : null,
    },
    attachmentNames: [...attachmentNames],
    imageNames: [...imageNames],
  }
}

interface UseFormWorkbenchDraftOptions {
  principalId: string | null
  storage?: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>
}

export function useFormWorkbenchDraft({ principalId, storage }: UseFormWorkbenchDraftOptions) {
  const draftStorage = storage ?? getBrowserStorage('session')
  // AI modified: an unowned legacy draft is discarded instead of being assigned to the next login.
  safeStorageDiscard(draftStorage, FORM_WORKBENCH_DRAFT_KEY)
  const restoredDraft = shallowRef(
    principalId ? readFormWorkbenchDraft(draftStorage, principalId) : undefined,
  )

  function saveDraft(submission: FormWorkbenchSubmitInput): FormWorkbenchDraft | undefined {
    if (!principalId) return undefined
    const draft = getFormWorkbenchDraft(submission, principalId)
    // AI modified: file blobs stay browser-owned; drafts persist only safe, restorable field values and names.
    safeStorageSet(draftStorage, getFormWorkbenchDraftKey(principalId), JSON.stringify(draft))
    restoredDraft.value = draft
    return draft
  }

  function clearDraft(): void {
    if (principalId) safeStorageDiscard(draftStorage, getFormWorkbenchDraftKey(principalId))
    restoredDraft.value = undefined
  }

  return { restoredDraft, saveDraft, clearDraft }
}
