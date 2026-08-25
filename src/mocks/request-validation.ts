import type { ZodType, ZodTypeDef } from 'zod'
import type { ApiResponse } from '@/lib/http'
import { HttpResponse } from 'msw'

type MockJsonBody<T> = { isValid: true, body: T } | { isValid: false, response: Response }

export interface MockJsonValidationFailure {
  code: string
  message: string
  status?: number
}

function getRequestBodyFailure(failure: MockJsonValidationFailure): Response {
  return HttpResponse.json<ApiResponse<null>>(
    { code: failure.code, message: failure.message, data: null },
    { status: failure.status ?? 400 },
  )
}

export async function readMockJsonBody<T = unknown>(
  request: Request,
  schema?: ZodType<T, ZodTypeDef, unknown>,
  invalidBodyFailure: MockJsonValidationFailure = {
    code: 'INVALID_REQUEST_BODY',
    message: '请求正文不符合接口约束',
  },
): Promise<MockJsonBody<T>> {
  let candidate: unknown
  try {
    candidate = await request.json()
  }
  catch {
    // AI modified: malformed JSON returns the same typed API boundary as structurally invalid input.
    return {
      isValid: false,
      response: getRequestBodyFailure({
        code: 'INVALID_JSON_BODY',
        message: '请求正文不是有效的 JSON',
      }),
    }
  }

  if (!schema)
    return { isValid: true, body: candidate as T }

  const validation = schema.safeParse(candidate)
  if (!validation.success) {
    return {
      isValid: false,
      response: getRequestBodyFailure(invalidBodyFailure),
    }
  }

  return { isValid: true, body: validation.data }
}
