export const DICTIONARY_STATUSES = ['active', 'disabled'] as const
// AI modified: dictionary tags reference semantic theme tokens instead of arbitrary color strings.
export const DICTIONARY_COLORS = [
  'primary',
  'success',
  'warning',
  'destructive',
  'secondary',
] as const

export type DictionaryStatus = (typeof DICTIONARY_STATUSES)[number]
export type DictionaryColor = (typeof DICTIONARY_COLORS)[number]

export interface DictionaryType {
  id: string
  code: string
  name: string
  description: string
  status: DictionaryStatus
  updatedAt: string
}

export interface DictionaryTypeInput {
  code: string
  name: string
  description: string
  status: DictionaryStatus
}

export interface DictionaryEntry {
  id: string
  typeId: string
  label: string
  value: string
  color: DictionaryColor
  order: number
  status: DictionaryStatus
}

export interface DictionaryEntryInput {
  label: string
  value: string
  color: DictionaryColor
  order: number
  status: DictionaryStatus
}

export interface DictionaryOption {
  label: string
  value: string
  color: DictionaryColor
  isDisabled: boolean
}

export interface DictionaryTypeListResponse {
  items: DictionaryType[]
}

export interface DictionaryEntryListResponse {
  items: DictionaryEntry[]
}

export interface DictionaryOptionResponse {
  code: string
  options: DictionaryOption[]
}
