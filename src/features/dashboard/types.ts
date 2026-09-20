import type { UserRole } from '@/features/users'

export interface DashboardSummary {
  totalUsers: number
  activeUsers: number
  activeUserRate: number
  registrationsLast30Days: number
  successfulLogins24Hours: number
  uniqueLoginUsers24Hours: number
  openTasks: number
  tasksDueSoon: number
}

export interface RegistrationTrendPoint {
  weekIndex: number
  weekStart: string
  registeredUsers: number
  totalUsers: number
}

export interface RoleDistributionEntry {
  role: UserRole
  userCount: number
  percentage: number
}

export interface DepartmentRankingEntry {
  departmentId: string
  departmentName: string
  activeUsers: number
}

export const DASHBOARD_TASK_STATUSES = ['todo', 'in_progress', 'done'] as const
export const DASHBOARD_TASK_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const

export type DashboardTaskStatus = (typeof DASHBOARD_TASK_STATUSES)[number]
export type DashboardTaskPriority = (typeof DASHBOARD_TASK_PRIORITIES)[number]

export interface DashboardTask {
  id: string
  titleKey: string
  status: DashboardTaskStatus
  priority: DashboardTaskPriority
  dueAt: string
  assigneeId: number
  assigneeName: string
}

export interface DashboardQuickAction {
  id: 'components' | 'profile' | 'roles' | 'users'
  labelKey: string
  descriptionKey: string
  to: string
}

export interface DashboardAnnouncement {
  id: string
  title: string
  body: string
  publishedAt: string
  tone: 'info' | 'warning'
}

export interface DashboardOperation {
  id: string
  actorName: string
  summary: string
  outcome: 'success' | 'failure'
  occurredAt: string
}

export interface DashboardNotification {
  id: string
  titleKey: string
  bodyKey: string
  createdAt: string
  tone: 'info' | 'success' | 'warning'
  isRead: boolean
}

export interface DashboardOverview {
  generatedAt: string
  summary: DashboardSummary
  registrationTrend: RegistrationTrendPoint[]
  roleDistribution: RoleDistributionEntry[]
  departmentRanking: DepartmentRankingEntry[]
  tasks: DashboardTask[]
  quickActions: DashboardQuickAction[]
  announcements: DashboardAnnouncement[]
  recentOperations: DashboardOperation[]
  notifications: DashboardNotification[]
}
