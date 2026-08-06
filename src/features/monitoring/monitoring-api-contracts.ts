import type {
  CacheHealth,
  MonitoringLog,
  MonitoringOverview,
  MonitoringSummary,
  OnlineSession,
  ScheduledJob,
  ServiceHealth,
} from './types'
import { z } from 'zod'
import { USER_ROLES } from '@/features/users/types'
import {
  CACHE_HEALTH_STATUSES,
  MONITORING_LOG_KINDS,
  MONITORING_LOG_SEVERITIES,
  SCHEDULED_JOB_STATUSES,
  SERVICE_HEALTH_STATUSES,
} from './types'

const MONITORING_SUMMARY_SCHEMA: z.ZodType<MonitoringSummary> = z
  .object({
    onlineSessionCount: z.number().int().nonnegative(),
    degradedServiceCount: z.number().int().nonnegative(),
    failedJobCount: z.number().int().nonnegative(),
    recentErrorCount: z.number().int().nonnegative(),
  })
  .strict()

const ONLINE_SESSION_SCHEMA: z.ZodType<OnlineSession> = z
  .object({
    id: z.string().trim().min(1).max(200),
    userName: z.string().trim().min(1).max(200),
    userIdentifier: z.string().trim().min(1).max(254),
    role: z.enum(USER_ROLES),
    ipAddress: z.string().trim().min(1).max(100),
    client: z.string().trim().min(1).max(500),
    signedInAt: z.string().datetime({ offset: true }),
    lastSeenAt: z.string().datetime({ offset: true }),
  })
  .strict()

const MONITORING_LOG_SCHEMA: z.ZodType<MonitoringLog> = z
  .object({
    id: z.string().trim().min(1).max(200),
    kind: z.enum(MONITORING_LOG_KINDS),
    severity: z.enum(MONITORING_LOG_SEVERITIES),
    actorName: z.string().trim().min(1).max(200),
    actorIdentifier: z.string().trim().min(1).max(254),
    ipAddress: z.string().trim().min(1).max(100),
    target: z.string().trim().min(1).max(1_000),
    summaryKey: z.string().trim().min(1).max(300),
    occurredAt: z.string().datetime({ offset: true }),
    statusCode: z.number().int().min(100).max(599).optional(),
    durationMs: z.number().int().nonnegative().optional(),
  })
  .strict()

const SERVICE_HEALTH_SCHEMA: z.ZodType<ServiceHealth> = z
  .object({
    id: z.string().trim().min(1).max(200),
    nameKey: z.string().trim().min(1).max(300),
    status: z.enum(SERVICE_HEALTH_STATUSES),
    uptimePercentage: z.number().min(0).max(100),
    latencyMs: z.number().int().nonnegative(),
    lastCheckedAt: z.string().datetime({ offset: true }),
    errorSummaryKey: z.string().trim().min(1).max(300).optional(),
  })
  .strict()

export const SCHEDULED_JOB_SCHEMA: z.ZodType<ScheduledJob> = z
  .object({
    id: z.string().trim().min(1).max(200),
    nameKey: z.string().trim().min(1).max(300),
    schedule: z.string().trim().min(1).max(500),
    status: z.enum(SCHEDULED_JOB_STATUSES),
    lastRunAt: z.string().datetime({ offset: true }),
    nextRunAt: z.string().datetime({ offset: true }),
    lastDurationMs: z.number().int().nonnegative(),
    errorSummaryKey: z.string().trim().min(1).max(300).optional(),
  })
  .strict()

export const CACHE_HEALTH_SCHEMA: z.ZodType<CacheHealth> = z
  .object({
    name: z.string().trim().min(1).max(200),
    driver: z.string().trim().min(1).max(200),
    status: z.enum(CACHE_HEALTH_STATUSES),
    entryCount: z.number().int().nonnegative(),
    hitRate: z.number().min(0).max(100),
    sizeBytes: z.number().int().nonnegative(),
    lastClearedAt: z.string().datetime({ offset: true }),
  })
  .strict()

// AI modified: monitoring data is checked as one privacy-sensitive aggregate before display.
export const MONITORING_OVERVIEW_SCHEMA: z.ZodType<MonitoringOverview> = z
  .object({
    generatedAt: z.string().datetime({ offset: true }),
    accessLevel: z.enum(['observer', 'operator']),
    summary: MONITORING_SUMMARY_SCHEMA,
    onlineSessions: z.array(ONLINE_SESSION_SCHEMA).max(500),
    logs: z.array(MONITORING_LOG_SCHEMA).max(500),
    services: z.array(SERVICE_HEALTH_SCHEMA).max(100),
    jobs: z.array(SCHEDULED_JOB_SCHEMA).max(200),
    caches: z.array(CACHE_HEALTH_SCHEMA).max(100),
  })
  .strict()
