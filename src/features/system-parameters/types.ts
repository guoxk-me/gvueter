export const SYSTEM_PARAMETER_STATUSES = ['active', 'disabled'] as const
export const SYSTEM_PARAMETER_KEY_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/

export type SystemParameterStatus = (typeof SYSTEM_PARAMETER_STATUSES)[number]

export interface SystemParameterRecord {
  id: string
  key: string
  value: string
  description: string
  status: SystemParameterStatus
  updatedAt: string
}

export interface SystemParameterInput {
  key: string
  value: string
  description: string
  status: SystemParameterStatus
}

export interface SystemParameterListFilters extends Record<string, string> {
  keyword: string
  status: SystemParameterStatus | 'all'
}

export interface SystemParameterListResponse {
  items: SystemParameterRecord[]
  total: number
}
