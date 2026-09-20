import type { DictionaryOption } from '@/features/dictionaries'

export type StatusTone = 'destructive' | 'neutral' | 'primary' | 'secondary' | 'success' | 'warning'

export interface PaginationChange {
  page: number
  pageSize: number
}

export interface DetailDescriptionItem {
  key: string
  label: string
  value?: boolean | null | number | string
  span?: 1 | 2 | 3
  copyable?: boolean
  tone?: StatusTone
}

export interface DictionarySelectionChange {
  option: DictionaryOption | null
  value: string | undefined
}
