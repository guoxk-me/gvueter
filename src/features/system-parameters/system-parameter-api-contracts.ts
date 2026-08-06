import type {
  SystemParameterInput,
  SystemParameterListResponse,
  SystemParameterRecord,
} from './types'
import { z } from 'zod'
import { SYSTEM_PARAMETER_KEY_PATTERN, SYSTEM_PARAMETER_STATUSES } from './types'

// AI modified: parameter values remain strings, but their record shape is checked before UI state updates.
export const SYSTEM_PARAMETER_RECORD_SCHEMA: z.ZodType<SystemParameterRecord> = z
  .object({
    id: z.string().trim().min(1).max(200),
    key: z.string().trim().min(1).max(200).regex(SYSTEM_PARAMETER_KEY_PATTERN),
    value: z.string().max(20_000),
    description: z.string().max(2_000),
    status: z.enum(SYSTEM_PARAMETER_STATUSES),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()

export const SYSTEM_PARAMETER_INPUT_SCHEMA: z.ZodType<SystemParameterInput> = z
  .object({
    key: z.string().trim().min(1).max(120).regex(SYSTEM_PARAMETER_KEY_PATTERN),
    value: z.string().trim().min(1).max(2_000),
    description: z.string().trim().max(240),
    status: z.enum(SYSTEM_PARAMETER_STATUSES),
  })
  .strict()

export const SYSTEM_PARAMETER_LIST_RESPONSE_SCHEMA: z.ZodType<SystemParameterListResponse> = z
  .object({
    items: z.array(SYSTEM_PARAMETER_RECORD_SCHEMA).max(200),
    total: z.number().int().nonnegative(),
  })
  .strict()
