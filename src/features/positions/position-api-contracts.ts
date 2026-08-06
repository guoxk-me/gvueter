import type { PositionInput, PositionListResponse, PositionRecord } from './types'
import { z } from 'zod'
import { POSITION_STATUSES } from './types'

// AI modified: position list and mutation payloads must satisfy one strict runtime contract.
export const POSITION_RECORD_SCHEMA: z.ZodType<PositionRecord> = z
  .object({
    id: z.string().trim().min(1).max(200),
    code: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(120),
    description: z.string().max(2_000),
    order: z.number().int().nonnegative(),
    status: z.enum(POSITION_STATUSES),
  })
  .strict()

export const POSITION_INPUT_SCHEMA: z.ZodType<PositionInput> = z
  .object({
    code: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z][a-z0-9-]*$/),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(240),
    order: z.number().int().min(0).max(1_000_000),
    status: z.enum(POSITION_STATUSES),
  })
  .strict()

export const POSITION_LIST_RESPONSE_SCHEMA: z.ZodType<PositionListResponse> = z
  .object({
    items: z.array(POSITION_RECORD_SCHEMA).max(200),
    total: z.number().int().nonnegative(),
  })
  .strict()
