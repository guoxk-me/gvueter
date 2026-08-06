import type {
  DictionaryEntry,
  DictionaryEntryInput,
  DictionaryEntryListResponse,
  DictionaryOption,
  DictionaryOptionResponse,
  DictionaryType,
  DictionaryTypeInput,
  DictionaryTypeListResponse,
} from './types'
import { z } from 'zod'
import { DICTIONARY_COLORS, DICTIONARY_STATUSES } from './types'

// AI modified: dictionary metadata and option projections share strict response schemas.
export const DICTIONARY_TYPE_SCHEMA: z.ZodType<DictionaryType> = z
  .object({
    id: z.string().trim().min(1).max(200),
    code: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(120),
    description: z.string().max(2_000),
    status: z.enum(DICTIONARY_STATUSES),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()

export const DICTIONARY_ENTRY_SCHEMA: z.ZodType<DictionaryEntry> = z
  .object({
    id: z.string().trim().min(1).max(200),
    typeId: z.string().trim().min(1).max(200),
    label: z.string().trim().min(1).max(200),
    value: z.string().trim().min(1).max(500),
    color: z.enum(DICTIONARY_COLORS),
    order: z.number().int().nonnegative(),
    status: z.enum(DICTIONARY_STATUSES),
  })
  .strict()

export const DICTIONARY_OPTION_SCHEMA: z.ZodType<DictionaryOption> = z
  .object({
    label: z.string().trim().min(1).max(200),
    value: z.string().trim().min(1).max(500),
    color: z.enum(DICTIONARY_COLORS),
    isDisabled: z.boolean(),
  })
  .strict()

export const DICTIONARY_TYPE_INPUT_SCHEMA: z.ZodType<DictionaryTypeInput> = z
  .object({
    code: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z][a-z0-9_]*$/),
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(240),
    status: z.enum(DICTIONARY_STATUSES),
  })
  .strict()

export const DICTIONARY_ENTRY_INPUT_SCHEMA: z.ZodType<DictionaryEntryInput> = z
  .object({
    label: z.string().trim().min(1).max(200),
    value: z.string().trim().min(1).max(500),
    color: z.enum(DICTIONARY_COLORS),
    order: z.number().int().min(0).max(1_000_000),
    status: z.enum(DICTIONARY_STATUSES),
  })
  .strict()

export const DICTIONARY_TYPE_LIST_RESPONSE_SCHEMA: z.ZodType<DictionaryTypeListResponse> = z
  .object({
    items: z.array(DICTIONARY_TYPE_SCHEMA).max(200),
  })
  .strict()

export const DICTIONARY_ENTRY_LIST_RESPONSE_SCHEMA: z.ZodType<DictionaryEntryListResponse> = z
  .object({
    items: z.array(DICTIONARY_ENTRY_SCHEMA).max(1_000),
  })
  .strict()

export const DICTIONARY_OPTION_RESPONSE_SCHEMA: z.ZodType<DictionaryOptionResponse> = z
  .object({
    code: z.string().trim().min(1).max(120),
    options: z.array(DICTIONARY_OPTION_SCHEMA).max(1_000),
  })
  .strict()
