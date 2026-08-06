import type { DepartmentInput, DepartmentListResponse, DepartmentRecord } from './types'
import { z } from 'zod'
import { DEPARTMENT_STATUSES } from './types'

// AI modified: department records are validated before hierarchy state can consume them.
export const DEPARTMENT_RECORD_SCHEMA: z.ZodType<DepartmentRecord> = z
  .object({
    id: z.string().trim().min(1).max(200),
    name: z.string().trim().min(1).max(120),
    parentId: z.string().trim().min(1).max(200).nullable(),
    order: z.number().int().nonnegative(),
    status: z.enum(DEPARTMENT_STATUSES),
  })
  .strict()

export const DEPARTMENT_INPUT_SCHEMA: z.ZodType<DepartmentInput> = z
  .object({
    name: z.string().trim().min(1).max(120),
    parentId: z.string().trim().min(1).max(200).nullable(),
    order: z.number().int().min(0).max(1_000_000),
    status: z.enum(DEPARTMENT_STATUSES),
  })
  .strict()

export const DEPARTMENT_LIST_RESPONSE_SCHEMA: z.ZodType<DepartmentListResponse> = z
  .object({
    items: z.array(DEPARTMENT_RECORD_SCHEMA).max(500),
  })
  .strict()
