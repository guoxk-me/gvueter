import type { CacheHealth, MonitoringOverview, ScheduledJob } from '@/features/monitoring/types'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import MonitoringSessionsTable from '@/features/monitoring/components/MonitoringSessionsTable.vue'
import { MONITORING_OVERVIEW_SCHEMA } from '@/features/monitoring/monitoring-api-contracts'
import { maskDisplayName, maskIpAddress } from '@/features/monitoring/privacy'
import { i18n } from '@/i18n'
import { get, post } from '@/lib/http'
import { generateMockToken } from '@/mocks/data/users'
import { resetMockMonitoring } from '@/mocks/handlers/monitoring'

describe('system monitoring', () => {
  beforeEach(() => {
    resetMockMonitoring()
    localStorage.removeItem('auth_token')
    sessionStorage.setItem('auth_token', generateMockToken(1))
  })

  afterEach(() => {
    localStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_token')
  })

  it('returns source-backed sessions, all log families, services, jobs, and caches', async () => {
    const overview = await get<MonitoringOverview>('/monitoring/overview', undefined, {
      responseSchema: MONITORING_OVERVIEW_SCHEMA,
    })

    expect(overview.accessLevel).toBe('operator')
    expect(
      overview.onlineSessions.some((session) => session.userIdentifier === 'admin@example.com'),
    ).toBe(true)
    expect(new Set(overview.logs.map((log) => log.kind))).toEqual(
      new Set(['login', 'operation', 'api', 'exception']),
    )
    expect(overview.services).toHaveLength(4)
    expect(overview.jobs).toHaveLength(3)
    expect(overview.caches).toHaveLength(3)
    expect(overview.summary.onlineSessionCount).toBe(overview.onlineSessions.length)
    expect(overview.logs.every((monitoringLog) => !('userId' in monitoringLog))).toBe(true)
  })

  it('prevents the monitoring overview from being stored by browsers or intermediaries', async () => {
    const response = await fetch('/api/monitoring/overview', {
      headers: { Authorization: `Bearer ${generateMockToken(1)}` },
    })

    // AI modified: the wire-level cache policy is part of the sensitive monitoring contract.
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('filters logs at the API boundary', async () => {
    const overview = await get<MonitoringOverview>('/monitoring/overview', {
      logKind: 'exception',
      severity: 'error',
      keyword: 'cache_timeout',
    })

    expect(overview.logs).toHaveLength(1)
    expect(overview.logs[0]).toMatchObject({
      kind: 'exception',
      severity: 'error',
      target: 'CACHE_TIMEOUT',
    })
  })

  it('scopes observer sessions and redacts IP and user identifiers without exposing internals', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(2))
    const overview = await get<MonitoringOverview>('/monitoring/overview')
    const serializedOverview = JSON.stringify(overview)

    expect(overview.accessLevel).toBe('observer')
    expect(overview.onlineSessions).toHaveLength(1)
    expect(overview.onlineSessions[0]).toMatchObject({
      userName: '内***',
      userIdentifier: 'e***@e***.com',
      ipAddress: '10.42.*.*',
    })
    expect(serializedOverview).not.toContain('editor@example.com')
    expect(serializedOverview).not.toContain('10.42.2.27')
    expect(serializedOverview.toLowerCase()).not.toContain('stacktrace')
    expect(serializedOverview.toLowerCase()).not.toContain('mock-secret')
    expect(overview.logs.some((monitoringLog) => monitoringLog.kind === 'operation')).toBe(true)
  })

  it('removes operation events when a monitoring observer lacks AuditLog access', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(3))

    const overview = await get<MonitoringOverview>('/monitoring/overview')
    const operationOverview = await get<MonitoringOverview>('/monitoring/overview', {
      logKind: 'operation',
    })

    // AI modified: API filtering prevents audit summaries from leaking through monitoring filters.
    expect(overview.accessLevel).toBe('observer')
    expect(overview.logs.some((monitoringLog) => monitoringLog.kind === 'operation')).toBe(false)
    expect(operationOverview.logs).toEqual([])
    expect(JSON.stringify(overview)).not.toContain('role:editor')
    expect(JSON.stringify(overview)).not.toContain('users:export')
  })

  it('terminates sessions, executes jobs, and clears named caches for administrators', async () => {
    const terminatedUserToken = generateMockToken(2)
    await post('/monitoring/sessions/session-editor-web/terminate')
    const afterTermination = await get<MonitoringOverview>('/monitoring/overview')
    expect(
      afterTermination.onlineSessions.some((session) => session.id === 'session-editor-web'),
    ).toBe(false)
    sessionStorage.setItem('auth_token', terminatedUserToken)
    await expect(get('/auth/me')).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
      status: 401,
    })
    sessionStorage.setItem('auth_token', generateMockToken(1))

    const executedJob = await post<ScheduledJob>('/monitoring/jobs/job-audit-archive/run')
    expect(executedJob).toMatchObject({ id: 'job-audit-archive', status: 'idle' })
    expect(executedJob.errorSummaryKey).toBeUndefined()

    const clearedCache = await post<CacheHealth>('/monitoring/caches/dashboard-overview/clear')
    expect(clearedCache).toMatchObject({
      name: 'dashboard-overview',
      entryCount: 0,
      sizeBytes: 0,
      status: 'healthy',
    })
  })

  it('rejects all monitoring mutations for non-admin users', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(2))

    await expect(post('/monitoring/sessions/session-editor-web/terminate')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
    await expect(post('/monitoring/jobs/job-session-cleanup/run')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
    await expect(post('/monitoring/caches/dictionary-options/clear')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
  })

  it('masks network and display identifiers deterministically', () => {
    expect(maskIpAddress('192.168.12.42')).toBe('192.168.*.*')
    expect(maskIpAddress('2001:db8::1')).toBe('****')
    expect(maskDisplayName('李明')).toBe('李***')
  })

  it('renders session termination only on the operator surface', async () => {
    const overview = await get<MonitoringOverview>('/monitoring/overview')
    const session = overview.onlineSessions[0]
    expect(session).toBeDefined()

    const observerTable = mount(MonitoringSessionsTable, {
      props: {
        sessions: session ? [session] : [],
        isLoading: false,
        canManage: false,
        isTerminating: false,
      },
      global: { plugins: [i18n] },
    })
    const operatorTable = mount(MonitoringSessionsTable, {
      props: {
        sessions: session ? [session] : [],
        isLoading: false,
        canManage: true,
        isTerminating: false,
      },
      global: { plugins: [i18n] },
    })
    const terminateLabel = i18n.global.t('monitoring.sessions.terminate')

    expect(
      observerTable
        .findAll('button')
        .some((button) => button.attributes('aria-label') === terminateLabel),
    ).toBe(false)
    expect(
      operatorTable
        .findAll('button')
        .some((button) => button.attributes('aria-label') === terminateLabel),
    ).toBe(true)

    observerTable.unmount()
    operatorTable.unmount()
  })
})
