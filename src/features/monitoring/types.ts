import type { UserRole } from '@/features/users'

export const MONITORING_LOG_KINDS = ['login', 'operation', 'api', 'exception'] as const
export const MONITORING_LOG_SEVERITIES = ['info', 'warning', 'error'] as const
export const SERVICE_HEALTH_STATUSES = ['healthy', 'degraded', 'outage'] as const
export const SCHEDULED_JOB_STATUSES = ['idle', 'running', 'failed'] as const
export const CACHE_HEALTH_STATUSES = ['healthy', 'warning'] as const
export const MONITORING_TABS = ['sessions', 'logs', 'services', 'jobs', 'caches'] as const

export type MonitoringLogKind = (typeof MONITORING_LOG_KINDS)[number]
export type MonitoringLogSeverity = (typeof MONITORING_LOG_SEVERITIES)[number]
export type ServiceHealthStatus = (typeof SERVICE_HEALTH_STATUSES)[number]
export type ScheduledJobStatus = (typeof SCHEDULED_JOB_STATUSES)[number]
export type CacheHealthStatus = (typeof CACHE_HEALTH_STATUSES)[number]
export type MonitoringAccessLevel = 'observer' | 'operator'
export type MonitoringTab = (typeof MONITORING_TABS)[number]

export interface MonitoringFilters extends Record<string, string> {
  keyword: string
  logKind: MonitoringLogKind | 'all'
  severity: MonitoringLogSeverity | 'all'
}

export const DEFAULT_MONITORING_FILTERS: Readonly<MonitoringFilters> = {
  keyword: '',
  logKind: 'all',
  severity: 'all',
}

export interface MonitoringSummary {
  onlineSessionCount: number
  degradedServiceCount: number
  failedJobCount: number
  recentErrorCount: number
}

export interface OnlineSession {
  id: string
  userName: string
  userIdentifier: string
  role: UserRole
  ipAddress: string
  client: string
  signedInAt: string
  lastSeenAt: string
}

export interface MonitoringLog {
  id: string
  kind: MonitoringLogKind
  severity: MonitoringLogSeverity
  actorName: string
  actorIdentifier: string
  ipAddress: string
  target: string
  summaryKey: string
  occurredAt: string
  statusCode?: number
  durationMs?: number
}

export interface ServiceHealth {
  id: string
  nameKey: string
  status: ServiceHealthStatus
  uptimePercentage: number
  latencyMs: number
  lastCheckedAt: string
  errorSummaryKey?: string
}

export interface ScheduledJob {
  id: string
  nameKey: string
  schedule: string
  status: ScheduledJobStatus
  lastRunAt: string
  nextRunAt: string
  lastDurationMs: number
  errorSummaryKey?: string
}

export interface CacheHealth {
  name: string
  driver: string
  status: CacheHealthStatus
  entryCount: number
  hitRate: number
  sizeBytes: number
  lastClearedAt: string
}

export interface MonitoringOverview {
  generatedAt: string
  accessLevel: MonitoringAccessLevel
  summary: MonitoringSummary
  onlineSessions: OnlineSession[]
  logs: MonitoringLog[]
  services: ServiceHealth[]
  jobs: ScheduledJob[]
  caches: CacheHealth[]
}
