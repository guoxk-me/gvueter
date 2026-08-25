export const USER_ROLES = ['admin', 'editor', 'viewer'] as const
export const USER_STATUSES = ['active', 'suspended'] as const

export type UserRole = (typeof USER_ROLES)[number]
export type UserStatus = (typeof USER_STATUSES)[number]

export interface UserListFilters extends Record<string, string> {
  keyword: string
  role: UserRole | 'all'
  status: UserStatus | 'all'
}

export interface AdminUser {
  id: number
  name: string
  email: string
  avatar?: string
  role: UserRole
  status: UserStatus
  /** Backend-issued department fields used by CASL data-scope conditions. */
  departmentId?: string
  departmentPath?: string
  createdAt: string
}

export interface UserListResponse {
  items: AdminUser[]
  total: number
  page: number
  pageSize: number
}

export type UserSortField = 'createdAt' | 'email' | 'name' | 'role' | 'status'

export interface UserListQuery {
  keyword: string
  role: UserRole | 'all'
  status: UserStatus | 'all'
  page: number
  pageSize: number
  sortField?: UserSortField
  sortDirection?: 'asc' | 'desc'
}

export interface UserInput {
  name: string
  email: string
  role: UserRole
  status: UserStatus
  temporaryPassword?: string
}

export type UserImportIssueCode
  = | 'DUPLICATE_EMAIL'
    | 'INVALID_COLUMN_COUNT'
    | 'INVALID_EMAIL'
    | 'INVALID_NAME'
    | 'INVALID_ROLE'
    | 'INVALID_STATUS'
    | 'ROLE_ASSIGNMENT_FORBIDDEN'
    | 'UNSAFE_SPREADSHEET_VALUE'

export interface UserImportIssue {
  row: number
  code: UserImportIssueCode
}

export interface UserImportResponse {
  createdCount: number
  skippedCount: number
  issues: UserImportIssue[]
}
