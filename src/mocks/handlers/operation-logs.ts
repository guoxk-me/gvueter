import type {
  OperationLogListResponse,
  OperationLogOutcome,
  OperationLogRecord,
} from '@/features/content-admin/types/operation-logs'
import type { AdminUser } from '@/features/users/types'
import type { ApiResponse } from '@/lib/http'
import { http, HttpResponse } from 'msw'
import { OPERATION_LOG_OUTCOMES } from '@/features/content-admin/types/operation-logs'
import { maskEmail } from '@/features/users/user-privacy'
import { NO_STORE_RESPONSE_HEADERS } from '@/mocks/response-headers'
import { authorizeMockPermission } from './auth'

const initialOperationLogs: OperationLogRecord[] = [
  {
    id: 'log-1',
    occurredAt: '2026-07-13T08:30:00.000Z',
    actorName: '超级管理员',
    actorEmailMasked: 'a***@e***.com',
    action: 'publish',
    resource: 'announcement',
    outcome: 'success',
    summary: 'Published announcement announcement-access-review.',
    ipMasked: '10.20.*.*',
  },
  {
    id: 'log-2',
    occurredAt: '2026-07-13T07:10:00.000Z',
    actorName: '内容编辑',
    actorEmailMasked: 'e***@e***.com',
    action: 'read',
    resource: 'operation-log',
    outcome: 'success',
    summary: 'Reviewed the operation log list.',
    ipMasked: '10.18.*.*',
  },
  {
    id: 'log-3',
    occurredAt: '2026-07-12T10:20:00.000Z',
    actorName: '超级管理员',
    actorEmailMasked: 'a***@e***.com',
    action: 'upload',
    resource: 'content-file',
    outcome: 'success',
    summary: 'Uploaded access-policy.pdf.',
    ipMasked: '10.20.*.*',
  },
  {
    id: 'log-4',
    occurredAt: '2026-07-11T05:40:00.000Z',
    actorName: '只读访客',
    actorEmailMasked: 'v***@e***.com',
    action: 'delete',
    resource: 'content-file',
    outcome: 'failure',
    summary: 'File deletion was denied by the authorization policy.',
    ipMasked: '172.16.*.*',
  },
  {
    id: 'log-5',
    occurredAt: '2026-07-10T09:00:00.000Z',
    actorName: '超级管理员',
    actorEmailMasked: 'a***@e***.com',
    action: 'update',
    resource: 'role',
    outcome: 'success',
    summary: 'Updated an editor permission policy.',
    ipMasked: '10.20.*.*',
  },
  {
    id: 'log-6',
    occurredAt: '2026-07-09T03:30:00.000Z',
    actorName: '内容编辑',
    actorEmailMasked: 'e***@e***.com',
    action: 'download',
    resource: 'content-file',
    outcome: 'success',
    summary: 'Downloaded release-notes.txt.',
    ipMasked: '10.18.*.*',
  },
]
const operationLogOutcomes = new Set<string>(OPERATION_LOG_OUTCOMES)
const operationLogs = initialOperationLogs.map(operationLog => ({ ...operationLog }))
let runtimeOperationLogSequence = 1

export interface MockOperationInput {
  action: string
  resource: string
  summary: string
  outcome?: OperationLogOutcome
}

function copyOperationLog(operationLog: OperationLogRecord): OperationLogRecord {
  // AI modified: the public detail contract is an explicit allow-list with masked identity and network fields.
  return {
    id: operationLog.id,
    occurredAt: operationLog.occurredAt,
    actorName: operationLog.actorName,
    actorEmailMasked: operationLog.actorEmailMasked,
    action: operationLog.action,
    resource: operationLog.resource,
    outcome: operationLog.outcome,
    summary: operationLog.summary,
    ipMasked: operationLog.ipMasked,
  }
}

export function getMockOperationLogSnapshot(): readonly OperationLogRecord[] {
  // AI modified: dashboard activity reads the same redacted snapshot exposed by operation-log APIs.
  return operationLogs.map(copyOperationLog)
}

export function recordMockOperation(
  actor: Pick<AdminUser, 'email' | 'name'>,
  operation: MockOperationInput,
): OperationLogRecord {
  const operationLog: OperationLogRecord = {
    id: `log-runtime-${runtimeOperationLogSequence++}`,
    occurredAt: new Date().toISOString(),
    actorName: actor.name,
    actorEmailMasked: maskEmail(actor.email),
    action: operation.action,
    resource: operation.resource,
    outcome: operation.outcome ?? 'success',
    summary: operation.summary,
    ipMasked: '10.0.*.*',
  }
  // AI modified: successful business mutations feed the same audit source used by the log page and Dashboard.
  operationLogs.unshift(operationLog)
  // AI modified: the browser-only audit demonstration keeps a bounded recent-history window.
  operationLogs.splice(500)
  return copyOperationLog(operationLog)
}

function isOperationLogOutcome(value: string): value is OperationLogOutcome {
  return operationLogOutcomes.has(value)
}

export function resetMockOperationLogs(): void {
  operationLogs.splice(
    0,
    operationLogs.length,
    ...initialOperationLogs.map(operationLog => ({ ...operationLog })),
  )
  runtimeOperationLogSequence = 1
}

export const listOperationLogsHandler = http.get('/api/operation-logs', ({ request }) => {
  const authentication = authorizeMockPermission(request, 'read', 'AuditLog')
  if (!authentication.isAuthenticated)
    return authentication.response
  const url = new URL(request.url)
  const startDate = url.searchParams.get('startDate') ?? ''
  const endDate = url.searchParams.get('endDate') ?? ''
  const actor = url.searchParams.get('actor')?.trim().toLocaleLowerCase() ?? ''
  const action = url.searchParams.get('action')?.trim().toLocaleLowerCase() ?? ''
  const resource = url.searchParams.get('resource')?.trim().toLocaleLowerCase() ?? ''
  const requestedOutcome = url.searchParams.get('outcome') ?? ''
  const requestedPage = Number(url.searchParams.get('page') ?? 1)
  const requestedPageSize = Number(url.searchParams.get('pageSize') ?? 10)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const pageSize
    = Number.isInteger(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, 100)
      : 10
  const outcome = isOperationLogOutcome(requestedOutcome) ? requestedOutcome : undefined
  const matchedLogs = operationLogs.filter(
    operationLog =>
      (!startDate || operationLog.occurredAt >= `${startDate}T00:00:00.000Z`)
      && (!endDate || operationLog.occurredAt <= `${endDate}T23:59:59.999Z`)
      && (!actor || operationLog.actorName.toLocaleLowerCase().includes(actor))
      && (!action || operationLog.action.toLocaleLowerCase().includes(action))
      && (!resource || operationLog.resource.toLocaleLowerCase().includes(resource))
      && (!outcome || operationLog.outcome === outcome),
  )
  const startIndex = (page - 1) * pageSize

  return HttpResponse.json<ApiResponse<OperationLogListResponse>>(
    {
      code: 0,
      message: 'success',
      data: {
        items: matchedLogs.slice(startIndex, startIndex + pageSize).map(copyOperationLog),
        total: matchedLogs.length,
        page,
        pageSize,
      },
    },
    { headers: NO_STORE_RESPONSE_HEADERS },
  )
})

export const operationLogDetailHandler = http.get<{ operationLogId: string }>(
  '/api/operation-logs/:operationLogId',
  ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'read', 'AuditLog')
    if (!authentication.isAuthenticated)
      return authentication.response
    const operationLog = operationLogs.find(candidate => candidate.id === params.operationLogId)
    if (!operationLog) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'OPERATION_LOG_NOT_FOUND', message: '操作日志不存在', data: null },
        { status: 404 },
      )
    }
    return HttpResponse.json<ApiResponse<OperationLogRecord>>(
      {
        code: 0,
        message: 'success',
        data: copyOperationLog(operationLog),
      },
      { headers: NO_STORE_RESPONSE_HEADERS },
    )
  },
)

export const operationLogHandlers = [listOperationLogsHandler, operationLogDetailHandler]
