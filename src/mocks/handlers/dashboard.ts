import type {
  DashboardAnnouncement,
  DashboardNotification,
  DashboardOperation,
  DashboardOverview,
  DashboardQuickAction,
  DashboardTask,
  DepartmentRankingEntry,
  RegistrationTrendPoint,
  RoleDistributionEntry,
} from '@/features/dashboard/types'
import type { UserRole } from '@/features/users/types'
import type { ApiResponse } from '@/lib/http'
import { http, HttpResponse } from 'msw'
import { getAnnouncementTextPreview } from '@/features/content-admin/content-admin-rules'
import { USER_ROLES } from '@/features/users/types'
import { getMockLoginActivities } from '@/mocks/data/dashboard'
import { mockUsers } from '@/mocks/data/users'
import { getPublishedMockAnnouncements } from './announcements'
import { authorizeMockPermission } from './auth'
import { getMockOperationLogSnapshot } from './operation-logs'

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000
const WEEK_IN_MILLISECONDS = 7 * DAY_IN_MILLISECONDS

const departmentNames: Readonly<Record<string, string>> = {
  company: 'GVUETER',
  finance: 'Finance',
  operations: 'Operations',
  product: 'Product',
  'product-design': 'Design',
  'product-engineering': 'Engineering',
}

const dashboardTasks: readonly Omit<DashboardTask, 'assigneeName'>[] = [
  {
    id: 'task-quarterly-access-review',
    titleKey: 'dashboard.tasks.accessReview',
    status: 'in_progress',
    priority: 'critical',
    dueAt: '2026-07-13T18:00:00.000Z',
    assigneeId: 1,
  },
  {
    id: 'task-publish-release-notes',
    titleKey: 'dashboard.tasks.releaseNotes',
    status: 'todo',
    priority: 'high',
    dueAt: '2026-07-14T08:00:00.000Z',
    assigneeId: 2,
  },
  {
    id: 'task-clean-suspended-accounts',
    titleKey: 'dashboard.tasks.suspendedAccounts',
    status: 'todo',
    priority: 'medium',
    dueAt: '2026-07-15T09:00:00.000Z',
    assigneeId: 5,
  },
  {
    id: 'task-verify-export-policy',
    titleKey: 'dashboard.tasks.exportPolicy',
    status: 'todo',
    priority: 'low',
    dueAt: '2026-07-17T09:00:00.000Z',
    assigneeId: 7,
  },
  {
    id: 'task-refresh-department-owners',
    titleKey: 'dashboard.tasks.departmentOwners',
    status: 'done',
    priority: 'medium',
    dueAt: '2026-07-12T10:00:00.000Z',
    assigneeId: 4,
  },
]

const dashboardQuickActions: readonly DashboardQuickAction[] = [
  {
    id: 'users',
    labelKey: 'nav.users',
    descriptionKey: 'dashboard.quickActions.usersDescription',
    to: '/users',
  },
  {
    id: 'roles',
    labelKey: 'nav.roles',
    descriptionKey: 'dashboard.quickActions.rolesDescription',
    to: '/roles',
  },
  {
    id: 'components',
    labelKey: 'nav.components',
    descriptionKey: 'dashboard.quickActions.componentsDescription',
    to: '/components',
  },
  {
    id: 'profile',
    labelKey: 'nav.profile',
    descriptionKey: 'dashboard.quickActions.profileDescription',
    to: '/profile',
  },
]

const dashboardNotifications: readonly DashboardNotification[] = [
  {
    id: 'notification-access-review',
    titleKey: 'dashboard.notifications.accessReviewTitle',
    bodyKey: 'dashboard.notifications.accessReviewBody',
    createdAt: '2026-07-13T07:30:00.000Z',
    tone: 'warning',
    isRead: false,
  },
  {
    id: 'notification-user-import',
    titleKey: 'dashboard.notifications.userImportTitle',
    bodyKey: 'dashboard.notifications.userImportBody',
    createdAt: '2026-07-13T06:45:00.000Z',
    tone: 'success',
    isRead: false,
  },
  {
    id: 'notification-release',
    titleKey: 'dashboard.notifications.releaseTitle',
    bodyKey: 'dashboard.notifications.releaseBody',
    createdAt: '2026-07-12T03:00:00.000Z',
    tone: 'info',
    isRead: true,
  },
]

function getUtcWeekStart(referenceDate: Date): Date {
  const weekStart = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
    ),
  )
  const daysSinceMonday = (weekStart.getUTCDay() + 6) % 7
  weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday)
  return weekStart
}

function getRegistrationTrend(referenceDate: Date): RegistrationTrendPoint[] {
  const currentWeekStart = getUtcWeekStart(referenceDate)

  return Array.from({ length: 12 }, (_, weekIndex) => {
    const weekStart = new Date(currentWeekStart.getTime() - (11 - weekIndex) * WEEK_IN_MILLISECONDS)
    const nextWeekStart = new Date(weekStart.getTime() + WEEK_IN_MILLISECONDS)
    const registeredUsers = mockUsers.filter((user) => {
      const createdAt = new Date(user.createdAt)
      return createdAt >= weekStart && createdAt < nextWeekStart
    }).length
    const totalUsers = mockUsers.filter((user) => new Date(user.createdAt) < nextWeekStart).length

    return {
      weekIndex,
      weekStart: weekStart.toISOString(),
      registeredUsers,
      totalUsers,
    }
  })
}

function getRoleDistribution(): RoleDistributionEntry[] {
  return USER_ROLES.map((role: UserRole) => {
    const userCount = mockUsers.filter((user) => user.role === role).length
    return {
      role,
      userCount,
      percentage: mockUsers.length === 0 ? 0 : (userCount / mockUsers.length) * 100,
    }
  })
}

function getDepartmentRanking(): DepartmentRankingEntry[] {
  const activeUsersByDepartment = new Map<string, number>()
  for (const user of mockUsers) {
    if (user.status !== 'active') continue
    const departmentId = user.departmentId ?? 'unassigned'
    activeUsersByDepartment.set(departmentId, (activeUsersByDepartment.get(departmentId) ?? 0) + 1)
  }

  return Array.from(activeUsersByDepartment, ([departmentId, activeUsers]) => ({
    departmentId,
    departmentName: departmentNames[departmentId] ?? departmentId,
    activeUsers,
  }))
    .sort(
      (leftDepartment, rightDepartment) =>
        rightDepartment.activeUsers - leftDepartment.activeUsers ||
        leftDepartment.departmentName.localeCompare(rightDepartment.departmentName),
    )
    .slice(0, 5)
}

function getDashboardTasks(): DashboardTask[] {
  return dashboardTasks.map((task) => {
    const assignee = mockUsers.find((user) => user.id === task.assigneeId)
    return {
      ...task,
      assigneeName: assignee?.name ?? String(task.assigneeId),
    }
  })
}

function getRecentOperations(): DashboardOperation[] {
  // AI modified: recent activity is a projection of the redacted operation-log source of truth.
  return [...getMockOperationLogSnapshot()]
    .sort((leftLog, rightLog) => rightLog.occurredAt.localeCompare(leftLog.occurredAt))
    .slice(0, 5)
    .map((operationLog) => ({
      id: operationLog.id,
      actorName: operationLog.actorName,
      summary: operationLog.summary,
      outcome: operationLog.outcome,
      occurredAt: operationLog.occurredAt,
    }))
}

function getDashboardAnnouncements(): DashboardAnnouncement[] {
  // AI modified: publication state now flows from the same collection managed by content administration.
  return getPublishedMockAnnouncements()
    .slice(0, 3)
    .map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      body: getAnnouncementTextPreview(announcement.content),
      publishedAt: announcement.publishedAt,
      tone: announcement.priority === 'normal' ? 'info' : 'warning',
    }))
}

export function createDashboardOverview(referenceDate = new Date()): DashboardOverview {
  const referenceTime = referenceDate.getTime()
  const tasks = getDashboardTasks()
  const recentSuccessfulLogins = getMockLoginActivities().filter((activity) => {
    const occurredAt = new Date(activity.occurredAt).getTime()
    return (
      activity.status === 'success' &&
      occurredAt <= referenceTime &&
      occurredAt >= referenceTime - DAY_IN_MILLISECONDS
    )
  })
  const openTasks = tasks.filter((task) => task.status !== 'done')
  const dueSoonLimit = referenceTime + DAY_IN_MILLISECONDS

  // AI modified: every headline metric reconciles to named mock business records.
  return {
    generatedAt: referenceDate.toISOString(),
    summary: {
      totalUsers: mockUsers.length,
      activeUsers: mockUsers.filter((user) => user.status === 'active').length,
      activeUserRate:
        mockUsers.length === 0
          ? 0
          : (mockUsers.filter((user) => user.status === 'active').length / mockUsers.length) * 100,
      registrationsLast30Days: mockUsers.filter((user) => {
        const createdAt = new Date(user.createdAt).getTime()
        return createdAt <= referenceTime && createdAt >= referenceTime - 30 * DAY_IN_MILLISECONDS
      }).length,
      successfulLogins24Hours: recentSuccessfulLogins.length,
      uniqueLoginUsers24Hours: new Set(recentSuccessfulLogins.map((activity) => activity.userId))
        .size,
      openTasks: openTasks.length,
      tasksDueSoon: openTasks.filter((task) => {
        const dueAt = new Date(task.dueAt).getTime()
        return dueAt >= referenceTime && dueAt <= dueSoonLimit
      }).length,
    },
    registrationTrend: getRegistrationTrend(referenceDate),
    roleDistribution: getRoleDistribution(),
    departmentRanking: getDepartmentRanking(),
    tasks,
    quickActions: dashboardQuickActions.map((action) => ({ ...action })),
    announcements: getDashboardAnnouncements(),
    recentOperations: getRecentOperations(),
    notifications: dashboardNotifications.map((notification) => ({ ...notification })),
  }
}

export const dashboardOverviewHandler = http.get('/api/dashboard/overview', ({ request }) => {
  const authentication = authorizeMockPermission(request, 'read', 'Dashboard')
  if (!authentication.isAuthenticated) return authentication.response

  return HttpResponse.json<ApiResponse<DashboardOverview>>({
    code: 0,
    message: 'success',
    data: createDashboardOverview(),
  })
})

export const dashboardHandlers = [dashboardOverviewHandler]
