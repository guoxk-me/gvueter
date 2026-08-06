import type {
  AdminUser,
  UserImportIssue,
  UserImportResponse,
  UserInput,
  UserListResponse,
} from './types'
import { z } from 'zod'
import { USER_ROLES, USER_STATUSES } from './types'

const userImportIssueCodes = [
  'DUPLICATE_EMAIL',
  'INVALID_COLUMN_COUNT',
  'INVALID_EMAIL',
  'INVALID_NAME',
  'INVALID_ROLE',
  'INVALID_STATUS',
  'ROLE_ASSIGNMENT_FORBIDDEN',
  'UNSAFE_SPREADSHEET_VALUE',
] as const

// AI modified: core user responses are checked before untrusted payloads enter table or session state.
export const ADMIN_USER_SCHEMA: z.ZodType<AdminUser> = z
  .object({
    id: z.number().int().positive(),
    name: z.string().trim().min(1).max(80),
    email: z.string().trim().min(1).max(254),
    avatar: z.string().min(1).max(200_000).optional(),
    role: z.enum(USER_ROLES),
    status: z.enum(USER_STATUSES),
    departmentId: z.string().trim().min(1).max(200).optional(),
    departmentPath: z.string().trim().min(1).max(500).optional(),
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict()

export const USER_LIST_RESPONSE_SCHEMA: z.ZodType<UserListResponse> = z
  .object({
    items: z.array(ADMIN_USER_SCHEMA).max(200),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().min(1).max(200),
  })
  .strict()

const USER_IMPORT_ISSUE_SCHEMA: z.ZodType<UserImportIssue> = z
  .object({
    row: z.number().int().positive(),
    code: z.enum(userImportIssueCodes),
  })
  .strict()

export const USER_IMPORT_RESPONSE_SCHEMA: z.ZodType<UserImportResponse> = z
  .object({
    createdCount: z.number().int().nonnegative(),
    skippedCount: z.number().int().nonnegative(),
    issues: z.array(USER_IMPORT_ISSUE_SCHEMA).max(200),
  })
  .strict()

export const USER_INPUT_SCHEMA: z.ZodType<UserInput> = z
  .object({
    name: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(254),
    role: z.enum(USER_ROLES),
    status: z.enum(USER_STATUSES),
    temporaryPassword: z.string().min(8).max(1024).optional(),
  })
  .strict()
