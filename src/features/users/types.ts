import type { components } from '@/types/openapi-generated'

export const USER_ROLES = ['admin', 'editor', 'viewer'] as const
export const USER_STATUSES = ['active', 'suspended'] as const

export type UserRole = (typeof USER_ROLES)[number]
export type UserStatus = (typeof USER_STATUSES)[number]

export interface UserListFilters extends Record<string, string> {
  keyword: string
  role: UserRole | 'all'
  status: UserStatus | 'all'
}

// AI modified: user transport records now follow the committed OpenAPI contract; UI-only filters remain local.
export type AdminUser = components['schemas']['AdminUser']
export type UserListResponse = components['schemas']['UserListResponse']

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

export type UserInput = components['schemas']['UserInput']

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
