import type {
  DataScopeGrant,
  RoleDefinition,
  RoleListResponse,
  RolePermission,
  UpdateRolePolicyInput,
} from './types'
import { z } from 'zod'
import { DEPARTMENT_RECORD_SCHEMA } from '@/features/departments'
import { USER_ROLES } from '@/features/users'
import { DATA_SCOPES, PERMISSION_ACTIONS, PERMISSION_SUBJECTS } from './types'

export const ROLE_PERMISSION_SCHEMA: z.ZodType<RolePermission> = z
  .object({
    action: z.enum(PERMISSION_ACTIONS),
    subject: z.enum(PERMISSION_SUBJECTS),
  })
  .strict()

export const DATA_SCOPE_GRANT_SCHEMA: z.ZodType<DataScopeGrant> = z
  .object({
    scope: z.enum(DATA_SCOPES),
    departmentIds: z.array(z.string().trim().min(1).max(200)).max(500).optional(),
  })
  .strict()

export const UPDATE_ROLE_POLICY_INPUT_SCHEMA: z.ZodType<UpdateRolePolicyInput> = z
  .object({
    permissions: z.array(ROLE_PERMISSION_SCHEMA).max(50),
    dataScope: DATA_SCOPE_GRANT_SCHEMA,
  })
  .strict()

// AI modified: role policies are rejected before they can update CASL or dynamic navigation state.
export const ROLE_DEFINITION_SCHEMA: z.ZodType<RoleDefinition> = z
  .object({
    key: z.enum(USER_ROLES),
    permissions: z.array(ROLE_PERMISSION_SCHEMA).max(50),
    dataScope: DATA_SCOPE_GRANT_SCHEMA,
  })
  .strict()

export const ROLE_LIST_RESPONSE_SCHEMA: z.ZodType<RoleListResponse> = z
  .object({
    items: z.array(ROLE_DEFINITION_SCHEMA).max(USER_ROLES.length),
    scopeDepartments: z.array(DEPARTMENT_RECORD_SCHEMA).max(500),
  })
  .strict()
