import type {
  DashboardAnnouncement,
  DashboardNotification,
  DashboardOperation,
  DashboardOverview,
  DashboardQuickAction,
  DashboardSummary,
  DashboardTask,
  DepartmentRankingEntry,
  RegistrationTrendPoint,
  RoleDistributionEntry,
} from './types'
import { z } from 'zod'
import { USER_ROLES } from '@/features/users'
import { DASHBOARD_TASK_PRIORITIES, DASHBOARD_TASK_STATUSES } from './types'

const DASHBOARD_SUMMARY_SCHEMA: z.ZodType<DashboardSummary> = z
  .object({
    totalUsers: z.number().int().nonnegative(),
    activeUsers: z.number().int().nonnegative(),
    activeUserRate: z.number().min(0).max(100),
    registrationsLast30Days: z.number().int().nonnegative(),
    successfulLogins24Hours: z.number().int().nonnegative(),
    uniqueLoginUsers24Hours: z.number().int().nonnegative(),
    openTasks: z.number().int().nonnegative(),
    tasksDueSoon: z.number().int().nonnegative(),
  })
  .strict()

const REGISTRATION_TREND_POINT_SCHEMA: z.ZodType<RegistrationTrendPoint> = z
  .object({
    weekIndex: z.number().int().nonnegative(),
    weekStart: z.string().datetime({ offset: true }),
    registeredUsers: z.number().int().nonnegative(),
    totalUsers: z.number().int().nonnegative(),
  })
  .strict()

const ROLE_DISTRIBUTION_ENTRY_SCHEMA: z.ZodType<RoleDistributionEntry> = z
  .object({
    role: z.enum(USER_ROLES),
    userCount: z.number().int().nonnegative(),
    percentage: z.number().min(0).max(100),
  })
  .strict()

const DEPARTMENT_RANKING_ENTRY_SCHEMA: z.ZodType<DepartmentRankingEntry> = z
  .object({
    departmentId: z.string().trim().min(1).max(200),
    departmentName: z.string().trim().min(1).max(200),
    activeUsers: z.number().int().nonnegative(),
  })
  .strict()

const DASHBOARD_TASK_SCHEMA: z.ZodType<DashboardTask> = z
  .object({
    id: z.string().trim().min(1).max(200),
    titleKey: z.string().trim().min(1).max(300),
    status: z.enum(DASHBOARD_TASK_STATUSES),
    priority: z.enum(DASHBOARD_TASK_PRIORITIES),
    dueAt: z.string().datetime({ offset: true }),
    assigneeId: z.number().int().positive(),
    assigneeName: z.string().trim().min(1).max(200),
  })
  .strict()

const DASHBOARD_QUICK_ACTION_SCHEMA: z.ZodType<DashboardQuickAction> = z
  .object({
    id: z.enum(['components', 'profile', 'roles', 'users']),
    labelKey: z.string().trim().min(1).max(300),
    descriptionKey: z.string().trim().min(1).max(300),
    to: z.string().trim().min(1).max(1_000),
  })
  .strict()

const DASHBOARD_ANNOUNCEMENT_SCHEMA: z.ZodType<DashboardAnnouncement> = z
  .object({
    id: z.string().trim().min(1).max(200),
    title: z.string().trim().min(1).max(500),
    body: z.string().max(10_000),
    publishedAt: z.string().datetime({ offset: true }),
    tone: z.enum(['info', 'warning']),
  })
  .strict()

const DASHBOARD_OPERATION_SCHEMA: z.ZodType<DashboardOperation> = z
  .object({
    id: z.string().trim().min(1).max(200),
    actorName: z.string().trim().min(1).max(200),
    summary: z.string().max(4_000),
    outcome: z.enum(['failure', 'success']),
    occurredAt: z.string().datetime({ offset: true }),
  })
  .strict()

const DASHBOARD_NOTIFICATION_SCHEMA: z.ZodType<DashboardNotification> = z
  .object({
    id: z.string().trim().min(1).max(200),
    titleKey: z.string().trim().min(1).max(300),
    bodyKey: z.string().trim().min(1).max(300),
    createdAt: z.string().datetime({ offset: true }),
    tone: z.enum(['info', 'success', 'warning']),
    isRead: z.boolean(),
  })
  .strict()

// AI modified: the complete dashboard projection is validated before any metric or chart renders.
export const DASHBOARD_OVERVIEW_SCHEMA: z.ZodType<DashboardOverview> = z
  .object({
    generatedAt: z.string().datetime({ offset: true }),
    summary: DASHBOARD_SUMMARY_SCHEMA,
    registrationTrend: z.array(REGISTRATION_TREND_POINT_SCHEMA).max(366),
    roleDistribution: z.array(ROLE_DISTRIBUTION_ENTRY_SCHEMA).max(USER_ROLES.length),
    departmentRanking: z.array(DEPARTMENT_RANKING_ENTRY_SCHEMA).max(100),
    tasks: z.array(DASHBOARD_TASK_SCHEMA).max(200),
    quickActions: z.array(DASHBOARD_QUICK_ACTION_SCHEMA).max(4),
    announcements: z.array(DASHBOARD_ANNOUNCEMENT_SCHEMA).max(100),
    recentOperations: z.array(DASHBOARD_OPERATION_SCHEMA).max(200),
    notifications: z.array(DASHBOARD_NOTIFICATION_SCHEMA).max(200),
  })
  .strict()
