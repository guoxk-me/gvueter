export type TagInputRejectReason = 'duplicate' | 'max-tags' | 'empty'

export interface TagInputRejection {
  value: string
  reason: TagInputRejectReason
}
