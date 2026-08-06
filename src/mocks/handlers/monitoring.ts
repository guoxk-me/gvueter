import type {
  CacheHealth,
  MonitoringFilters,
  MonitoringLog,
  MonitoringLogKind,
  MonitoringLogSeverity,
  MonitoringOverview,
  OnlineSession,
  ScheduledJob,
  ServiceHealth,
} from '@/features/monitoring/types'
import type { ApiResponse } from '@/lib/http'
import type { MockUser } from '@/mocks/data/users'
import { http, HttpResponse } from 'msw'
import { maskDisplayName, maskIpAddress } from '@/features/monitoring/privacy'
import { MONITORING_LOG_KINDS, MONITORING_LOG_SEVERITIES } from '@/features/monitoring/types'
import { getRolePermissions } from '@/features/roles/role-policy'
import { maskEmail } from '@/features/users/user-privacy'
import { getMockLoginActivities } from '@/mocks/data/dashboard'
import { mockUsers, revokeMockUserSessions } from '@/mocks/data/users'
import { NO_STORE_RESPONSE_HEADERS } from '@/mocks/response-headers'
import { authorizeMockPermission } from './auth'

interface StoredOnlineSession {
  id: string
  userId: number
  ipAddress: string
  client: string
  signedInAt: string
  lastSeenAt: string
}

interface MonitoringLogSeed {
  id: string
  kind: Exclude<MonitoringLogKind, 'login'>
  severity: MonitoringLogSeverity
  userId?: number
  ipAddress: string
  target: string
  summaryKey: string
  occurredAt: string
  statusCode?: number
  durationMs?: number
}

const initialOnlineSessions: readonly StoredOnlineSession[] = [
  {
    id: 'session-admin-web',
    userId: 1,
    ipAddress: '10.42.1.18',
    client: 'Chrome 126 / macOS',
    signedInAt: '2026-07-13T08:12:00.000Z',
    lastSeenAt: '2026-07-13T09:56:00.000Z',
  },
  {
    id: 'session-editor-web',
    userId: 2,
    ipAddress: '10.42.2.27',
    client: 'Edge 126 / Windows',
    signedInAt: '2026-07-13T04:40:00.000Z',
    lastSeenAt: '2026-07-13T09:54:00.000Z',
  },
  {
    id: 'session-design-mobile',
    userId: 4,
    ipAddress: '10.42.4.33',
    client: 'Safari / iOS',
    signedInAt: '2026-07-13T06:05:00.000Z',
    lastSeenAt: '2026-07-13T09:47:00.000Z',
  },
  {
    id: 'session-editor-cli',
    userId: 5,
    ipAddress: '10.42.5.41',
    client: 'Admin CLI / Linux',
    signedInAt: '2026-07-13T07:10:00.000Z',
    lastSeenAt: '2026-07-13T09:38:00.000Z',
  },
  {
    id: 'session-engineering-web',
    userId: 7,
    ipAddress: '10.42.7.52',
    client: 'Firefox 128 / Linux',
    signedInAt: '2026-07-13T08:45:00.000Z',
    lastSeenAt: '2026-07-13T09:51:00.000Z',
  },
]

const serviceHealthSeeds: readonly ServiceHealth[] = [
  {
    id: 'service-api',
    nameKey: 'monitoring.services.api',
    status: 'healthy',
    uptimePercentage: 99.99,
    latencyMs: 82,
    lastCheckedAt: '2026-07-13T09:58:00.000Z',
  },
  {
    id: 'service-database',
    nameKey: 'monitoring.services.database',
    status: 'healthy',
    uptimePercentage: 99.98,
    latencyMs: 24,
    lastCheckedAt: '2026-07-13T09:58:00.000Z',
  },
  {
    id: 'service-worker',
    nameKey: 'monitoring.services.worker',
    status: 'degraded',
    uptimePercentage: 99.72,
    latencyMs: 318,
    lastCheckedAt: '2026-07-13T09:58:00.000Z',
    errorSummaryKey: 'monitoring.errors.workerBacklog',
  },
  {
    id: 'service-storage',
    nameKey: 'monitoring.services.storage',
    status: 'healthy',
    uptimePercentage: 99.96,
    latencyMs: 105,
    lastCheckedAt: '2026-07-13T09:58:00.000Z',
  },
]

const initialScheduledJobs: readonly ScheduledJob[] = [
  {
    id: 'job-session-cleanup',
    nameKey: 'monitoring.jobs.sessionCleanup',
    schedule: '0 */6 * * *',
    status: 'idle',
    lastRunAt: '2026-07-13T06:00:00.000Z',
    nextRunAt: '2026-07-13T12:00:00.000Z',
    lastDurationMs: 842,
  },
  {
    id: 'job-dictionary-refresh',
    nameKey: 'monitoring.jobs.dictionaryRefresh',
    schedule: '*/30 * * * *',
    status: 'idle',
    lastRunAt: '2026-07-13T09:30:00.000Z',
    nextRunAt: '2026-07-13T10:00:00.000Z',
    lastDurationMs: 186,
  },
  {
    id: 'job-audit-archive',
    nameKey: 'monitoring.jobs.auditArchive',
    schedule: '30 2 * * *',
    status: 'failed',
    lastRunAt: '2026-07-13T02:30:00.000Z',
    nextRunAt: '2026-07-14T02:30:00.000Z',
    lastDurationMs: 12480,
    errorSummaryKey: 'monitoring.errors.archiveUnavailable',
  },
]

const initialCaches: readonly CacheHealth[] = [
  {
    name: 'dictionary-options',
    driver: 'memory',
    status: 'healthy',
    entryCount: 24,
    hitRate: 96.4,
    sizeBytes: 182400,
    lastClearedAt: '2026-07-12T02:00:00.000Z',
  },
  {
    name: 'permission-snapshots',
    driver: 'redis',
    status: 'healthy',
    entryCount: 86,
    hitRate: 98.8,
    sizeBytes: 734208,
    lastClearedAt: '2026-07-11T02:00:00.000Z',
  },
  {
    name: 'dashboard-overview',
    driver: 'redis',
    status: 'warning',
    entryCount: 12,
    hitRate: 71.2,
    sizeBytes: 286720,
    lastClearedAt: '2026-07-10T02:00:00.000Z',
  },
]

const monitoringLogSeeds: readonly MonitoringLogSeed[] = [
  {
    id: 'operation-role-policy',
    kind: 'operation',
    severity: 'info',
    userId: 1,
    ipAddress: '10.42.1.18',
    target: 'role:editor',
    summaryKey: 'monitoring.logs.rolePolicyUpdated',
    occurredAt: '2026-07-13T08:35:00.000Z',
  },
  {
    id: 'operation-user-export',
    kind: 'operation',
    severity: 'warning',
    userId: 2,
    ipAddress: '10.42.2.27',
    target: 'users:export',
    summaryKey: 'monitoring.logs.userExported',
    occurredAt: '2026-07-13T07:42:00.000Z',
  },
  {
    id: 'api-users-list',
    kind: 'api',
    severity: 'info',
    userId: 2,
    ipAddress: '10.42.2.27',
    target: 'GET /api/users',
    summaryKey: 'monitoring.logs.apiCompleted',
    occurredAt: '2026-07-13T09:43:00.000Z',
    statusCode: 200,
    durationMs: 126,
  },
  {
    id: 'api-role-forbidden',
    kind: 'api',
    severity: 'warning',
    userId: 3,
    ipAddress: '10.42.3.31',
    target: 'PUT /api/roles/editor',
    summaryKey: 'monitoring.logs.apiForbidden',
    occurredAt: '2026-07-13T08:02:00.000Z',
    statusCode: 403,
    durationMs: 38,
  },
  {
    id: 'api-dashboard-slow',
    kind: 'api',
    severity: 'warning',
    userId: 5,
    ipAddress: '10.42.5.41',
    target: 'GET /api/dashboard/overview',
    summaryKey: 'monitoring.logs.apiSlow',
    occurredAt: '2026-07-13T07:36:00.000Z',
    statusCode: 200,
    durationMs: 1280,
  },
  {
    id: 'exception-cache-timeout',
    kind: 'exception',
    severity: 'error',
    ipAddress: '10.42.0.12',
    target: 'CACHE_TIMEOUT',
    summaryKey: 'monitoring.logs.cacheTimeout',
    occurredAt: '2026-07-13T07:34:00.000Z',
  },
  {
    id: 'exception-archive-unavailable',
    kind: 'exception',
    severity: 'error',
    ipAddress: '10.42.0.19',
    target: 'ARCHIVE_STORAGE_UNAVAILABLE',
    summaryKey: 'monitoring.logs.archiveUnavailable',
    occurredAt: '2026-07-13T02:30:12.000Z',
  },
]

let onlineSessions = initialOnlineSessions.map((session) => ({ ...session }))
let scheduledJobs = initialScheduledJobs.map((job) => ({ ...job }))
let caches = initialCaches.map((cache) => ({ ...cache }))

function getUser(userId: number | undefined): MockUser | undefined {
  return userId === undefined ? undefined : mockUsers.find((user) => user.id === userId)
}

function getIdentity(user: MockUser | undefined, isOperator: boolean) {
  if (!user) return { actorName: 'system', actorIdentifier: 'system' }

  return {
    actorName: isOperator ? user.name : maskDisplayName(user.name),
    actorIdentifier: isOperator ? user.email : maskEmail(user.email),
  }
}

function getVisibleIpAddress(ipAddress: string, isOperator: boolean): string {
  return isOperator ? ipAddress : maskIpAddress(ipAddress)
}

function getOnlineSessions(currentUser: MockUser, keyword: string): OnlineSession[] {
  const isOperator = currentUser.role === 'admin'
  return onlineSessions
    .filter((session) => isOperator || session.userId === currentUser.id)
    .flatMap((session) => {
      const user = getUser(session.userId)
      if (!user) return []
      const identity = getIdentity(user, isOperator)
      return [
        {
          id: session.id,
          userName: identity.actorName,
          userIdentifier: identity.actorIdentifier,
          role: user.role,
          ipAddress: getVisibleIpAddress(session.ipAddress, isOperator),
          client: session.client,
          signedInAt: session.signedInAt,
          lastSeenAt: session.lastSeenAt,
        },
      ]
    })
    .filter((session) => {
      const searchableText = [
        session.userName,
        session.userIdentifier,
        session.ipAddress,
        session.client,
      ]
        .join(' ')
        .toLowerCase()
      return !keyword || searchableText.includes(keyword)
    })
}

function getLoginLogs(currentUser: MockUser): MonitoringLog[] {
  const isOperator = currentUser.role === 'admin'
  return getMockLoginActivities()
    .filter((activity) => isOperator || activity.userId === currentUser.id)
    .flatMap((activity, activityIndex) => {
      const user = getUser(activity.userId)
      if (!user) return []
      const identity = getIdentity(user, isOperator)
      const ipAddress = `10.42.${activity.userId}.${20 + activityIndex}`
      return [
        {
          id: activity.id,
          kind: 'login' as const,
          severity: activity.status === 'success' ? ('info' as const) : ('warning' as const),
          actorName: identity.actorName,
          actorIdentifier: identity.actorIdentifier,
          ipAddress: getVisibleIpAddress(ipAddress, isOperator),
          target: 'POST /api/auth/login',
          summaryKey:
            activity.status === 'success'
              ? 'monitoring.logs.loginSuccess'
              : 'monitoring.logs.loginFailed',
          occurredAt: activity.occurredAt,
          statusCode: activity.status === 'success' ? 200 : 401,
        },
      ]
    })
}

function getSeedLogs(currentUser: MockUser): MonitoringLog[] {
  const isOperator = currentUser.role === 'admin'
  return monitoringLogSeeds.map((seed) => {
    const { userId, ...publicLog } = seed
    const identity = getIdentity(getUser(userId), isOperator)
    // AI modified: internal user IDs must not cross the strict public monitoring contract.
    return {
      ...publicLog,
      actorName: identity.actorName,
      actorIdentifier: identity.actorIdentifier,
      ipAddress: getVisibleIpAddress(seed.ipAddress, isOperator),
    }
  })
}

function getVisibleMonitoringLogs(currentUser: MockUser): MonitoringLog[] {
  const canReadAuditLogs = getRolePermissions(currentUser.role).some(
    (permission) => permission.action === 'read' && permission.subject === 'AuditLog',
  )

  // AI modified: operation-event summaries remain behind AuditLog even inside Monitoring data.
  return [...getLoginLogs(currentUser), ...getSeedLogs(currentUser)].filter(
    (log) => log.kind !== 'operation' || canReadAuditLogs,
  )
}

function getFilters(request: Request): MonitoringFilters {
  const searchParams = new URL(request.url).searchParams
  const requestedKind = searchParams.get('logKind') ?? 'all'
  const requestedSeverity = searchParams.get('severity') ?? 'all'
  return {
    keyword: (searchParams.get('keyword') ?? '').trim().toLowerCase().slice(0, 80),
    logKind:
      requestedKind === 'all' || MONITORING_LOG_KINDS.includes(requestedKind as MonitoringLogKind)
        ? (requestedKind as MonitoringFilters['logKind'])
        : 'all',
    severity:
      requestedSeverity === 'all' ||
      MONITORING_LOG_SEVERITIES.includes(requestedSeverity as MonitoringLogSeverity)
        ? (requestedSeverity as MonitoringFilters['severity'])
        : 'all',
  }
}

function getMonitoringOverview(
  currentUser: MockUser,
  filters: MonitoringFilters,
): MonitoringOverview {
  const visibleSessions = getOnlineSessions(currentUser, filters.keyword)
  const visibleLogs = getVisibleMonitoringLogs(currentUser)
  const logs = visibleLogs
    .filter((log) => filters.logKind === 'all' || log.kind === filters.logKind)
    .filter((log) => filters.severity === 'all' || log.severity === filters.severity)
    .filter((log) => {
      const searchableText = [
        log.actorName,
        log.actorIdentifier,
        log.ipAddress,
        log.target,
        log.kind,
      ]
        .join(' ')
        .toLowerCase()
      return !filters.keyword || searchableText.includes(filters.keyword)
    })
    .sort((leftLog, rightLog) => rightLog.occurredAt.localeCompare(leftLog.occurredAt))

  // AI modified: observer responses are scoped and redacted before leaving the mock API boundary.
  return {
    generatedAt: new Date().toISOString(),
    accessLevel: currentUser.role === 'admin' ? 'operator' : 'observer',
    summary: {
      onlineSessionCount: visibleSessions.length,
      degradedServiceCount: serviceHealthSeeds.filter((service) => service.status !== 'healthy')
        .length,
      failedJobCount: scheduledJobs.filter((job) => job.status === 'failed').length,
      recentErrorCount: visibleLogs.filter((log) => log.severity === 'error').length,
    },
    onlineSessions: visibleSessions,
    logs,
    services: serviceHealthSeeds.map((service) => ({ ...service })),
    jobs: scheduledJobs.map((job) => ({ ...job })),
    caches: caches.map((cache) => ({ ...cache })),
  }
}

function getOperationFailure(message: string, code: string, status: number) {
  return HttpResponse.json<ApiResponse<null>>({ code, message, data: null }, { status })
}

export function resetMockMonitoring(): void {
  onlineSessions = initialOnlineSessions.map((session) => ({ ...session }))
  scheduledJobs = initialScheduledJobs.map((job) => ({ ...job }))
  caches = initialCaches.map((cache) => ({ ...cache }))
}

export const monitoringOverviewHandler = http.get('/api/monitoring/overview', ({ request }) => {
  const authentication = authorizeMockPermission(request, 'read', 'Monitoring')
  if (!authentication.isAuthenticated) return authentication.response

  return HttpResponse.json<ApiResponse<MonitoringOverview>>(
    {
      code: 0,
      message: 'success',
      data: getMonitoringOverview(authentication.user, getFilters(request)),
    },
    { headers: NO_STORE_RESPONSE_HEADERS },
  )
})

export const terminateSessionHandler = http.post<{ sessionId: string }>(
  '/api/monitoring/sessions/:sessionId/terminate',
  ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'update', 'Monitoring')
    if (!authentication.isAuthenticated) return authentication.response

    const sessionIndex = onlineSessions.findIndex((session) => session.id === params.sessionId)
    if (sessionIndex < 0) return getOperationFailure('会话不存在或已下线', 'SESSION_NOT_FOUND', 404)

    const terminatedSession = onlineSessions[sessionIndex]
    if (!terminatedSession)
      return getOperationFailure('会话不存在或已下线', 'SESSION_NOT_FOUND', 404)
    // AI modified: a terminated Mock monitoring session must revoke usable credentials, not only its row.
    revokeMockUserSessions(terminatedSession.userId)
    onlineSessions.splice(sessionIndex, 1)
    return HttpResponse.json<ApiResponse<null>>({ code: 0, message: 'terminated', data: null })
  },
)

export const runScheduledJobHandler = http.post<{ jobId: string }>(
  '/api/monitoring/jobs/:jobId/run',
  ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'update', 'Monitoring')
    if (!authentication.isAuthenticated) return authentication.response

    const job = scheduledJobs.find((candidate) => candidate.id === params.jobId)
    if (!job) return getOperationFailure('定时任务不存在', 'JOB_NOT_FOUND', 404)

    const executedAt = new Date()
    job.status = 'idle'
    job.lastRunAt = executedAt.toISOString()
    job.nextRunAt = new Date(executedAt.getTime() + 6 * 60 * 60 * 1000).toISOString()
    job.lastDurationMs = 320 + job.id.length * 17
    job.errorSummaryKey = undefined
    return HttpResponse.json<ApiResponse<ScheduledJob>>({
      code: 0,
      message: 'executed',
      data: { ...job },
    })
  },
)

export const clearNamedCacheHandler = http.post<{ cacheName: string }>(
  '/api/monitoring/caches/:cacheName/clear',
  ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'update', 'Monitoring')
    if (!authentication.isAuthenticated) return authentication.response

    const cache = caches.find((candidate) => candidate.name === params.cacheName)
    if (!cache) return getOperationFailure('缓存不存在', 'CACHE_NOT_FOUND', 404)

    cache.entryCount = 0
    cache.sizeBytes = 0
    cache.status = 'healthy'
    cache.lastClearedAt = new Date().toISOString()
    return HttpResponse.json<ApiResponse<CacheHealth>>({
      code: 0,
      message: 'cleared',
      data: { ...cache },
    })
  },
)

export const monitoringHandlers = [
  monitoringOverviewHandler,
  terminateSessionHandler,
  runScheduledJobHandler,
  clearNamedCacheHandler,
]
