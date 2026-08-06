export const OPERATION_LOG_OUTCOMES = ['success', 'failure'] as const

export type OperationLogOutcome = (typeof OPERATION_LOG_OUTCOMES)[number]

export interface OperationLogRecord {
  id: string
  occurredAt: string
  actorName: string
  actorEmailMasked: string
  action: string
  resource: string
  outcome: OperationLogOutcome
  summary: string
  ipMasked: string
}

export interface OperationLogListResponse {
  items: OperationLogRecord[]
  total: number
  page: number
  pageSize: number
}

export interface OperationLogFilters {
  startDate: string
  endDate: string
  actor: string
  action: string
  resource: string
  outcome: OperationLogOutcome | 'all'
  page: number
  pageSize: number
}
