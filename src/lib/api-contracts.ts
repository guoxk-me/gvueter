import { z } from 'zod'

export type JsonValue
  = | boolean
    | null
    | number
    | string
    | JsonValue[]
    | {
      [key: string]: JsonValue
    }

export const MAX_JSON_DEPTH = 40
export const MAX_JSON_NODES = 50_000
export const MAX_JSON_STRING_LENGTH = 1_000_000

function isBoundedJsonValue(value: unknown): value is JsonValue {
  const pendingValues: Array<{ depth: number, value: unknown }> = [{ depth: 0, value }]
  const visitedContainers = new WeakSet<object>()
  let nodeCount = 0

  while (pendingValues.length > 0) {
    const current = pendingValues.pop()
    if (!current || current.depth > MAX_JSON_DEPTH)
      return false
    nodeCount += 1
    if (nodeCount > MAX_JSON_NODES)
      return false

    const candidate = current.value
    if (
      candidate === null
      || typeof candidate === 'boolean'
      || (typeof candidate === 'number' && Number.isFinite(candidate))
    ) {
      continue
    }
    if (typeof candidate === 'string') {
      if (candidate.length > MAX_JSON_STRING_LENGTH)
        return false
      continue
    }
    if (typeof candidate !== 'object')
      return false
    if (visitedContainers.has(candidate))
      return false
    visitedContainers.add(candidate)

    const childValues = Array.isArray(candidate) ? candidate : Object.values(candidate)
    for (const childValue of childValues) {
      pendingValues.push({ depth: current.depth + 1, value: childValue })
    }
  }

  return true
}

// AI modified: iterative limits prevent hostile JSON depth or volume from exhausting validation.
export const JSON_VALUE_SCHEMA: z.ZodType<JsonValue> = z.custom<JsonValue>(isBoundedJsonValue, {
  message: 'JSON exceeds the supported shape, depth, or node budget',
})

export const API_ENVELOPE_SCHEMA = z
  .object({
    code: z.union([z.number().finite(), z.string().min(1).max(200)]),
    message: z.string().max(10_000),
    data: JSON_VALUE_SCHEMA,
  })
  .strict()

// AI modified: command endpoints must explicitly return the documented null payload.
export const EMPTY_RESPONSE_SCHEMA = z.null()

export const PAGE_REQUEST_SCHEMA = z
  .object({
    page: z.number().int().positive(),
    pageSize: z.number().int().min(1).max(200),
    sortField: z.string().trim().min(1).optional(),
    sortDirection: z.enum(['asc', 'desc']).optional(),
    keyword: z.string().trim().max(200).optional(),
  })
  .strict()

export const PAGE_RESPONSE_SCHEMA = z
  .object({
    items: z.array(JSON_VALUE_SCHEMA).max(200),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().min(1).max(200),
  })
  .strict()
  .superRefine((response, context) => {
    if (response.items.length > response.pageSize) {
      context.addIssue({
        code: 'custom',
        message: 'items cannot exceed pageSize',
        path: ['items'],
      })
    }
    if (response.items.length > response.total) {
      context.addIssue({
        code: 'custom',
        message: 'items cannot exceed total',
        path: ['total'],
      })
    }
  })

export const API_FIELD_ERROR_SCHEMA = z.union([
  z.string().min(1).max(1_000),
  z.array(z.string().min(1).max(1_000)).min(1).max(100),
])

export const API_ERROR_DETAILS_SCHEMA = z
  .object({
    fieldErrors: z.record(API_FIELD_ERROR_SCHEMA).optional(),
    requestId: z.string().trim().min(1).max(200).optional(),
    retryAfterSeconds: z.number().int().nonnegative().optional(),
  })
  .catchall(JSON_VALUE_SCHEMA)

export const UPLOAD_RECEIPT_SCHEMA = z
  .object({
    fileId: z.string().trim().min(1),
    fileName: z
      .string()
      .trim()
      .min(1)
      .max(180)
      .refine(
        fileName =>
          !fileName.startsWith('.')
          && !fileName.endsWith('.')
          && !/[\\/]/.test(fileName)
          && ![...fileName].some((character) => {
            const characterCode = character.charCodeAt(0)
            return characterCode < 32 || characterCode === 127
          }),
        'fileName must be a safe display name',
      ),
    contentType: z
      .string()
      .trim()
      .max(200)
      .regex(/^[\w!#$&^.+-]+\/[\w!#$&^.+-]+$/),
    sizeBytes: z.number().int().nonnegative(),
    uploadedAt: z
      .string()
      .refine(
        value =>
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value),
        'uploadedAt must be an ISO 8601 date-time with an explicit offset',
      ),
  })
  .strict()

export const BUSINESS_TIME_ZONE_SCHEMA = z.string().refine((timeZone) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format()
    return timeZone === 'UTC' || timeZone.includes('/')
  }
  catch {
    return false
  }
}, 'timeZone must be UTC or a supported IANA time-zone identifier')

export type ApiContractEnvelope = z.infer<typeof API_ENVELOPE_SCHEMA>
export type ApiContractPageRequest = z.infer<typeof PAGE_REQUEST_SCHEMA>
export type ApiContractPageResponse = z.infer<typeof PAGE_RESPONSE_SCHEMA>
export type ApiContractErrorDetails = z.infer<typeof API_ERROR_DETAILS_SCHEMA>
export type UploadReceipt = z.infer<typeof UPLOAD_RECEIPT_SCHEMA>
