export const POSITION_STATUSES = ['active', 'disabled'] as const

export type PositionStatus = (typeof POSITION_STATUSES)[number]

export interface PositionRecord {
  id: string
  code: string
  name: string
  description: string
  order: number
  status: PositionStatus
}

export interface PositionInput {
  code: string
  name: string
  description: string
  order: number
  status: PositionStatus
}

export interface PositionListFilters extends Record<string, string> {
  keyword: string
  status: PositionStatus | 'all'
}

export interface PositionListResponse {
  items: PositionRecord[]
  total: number
}
