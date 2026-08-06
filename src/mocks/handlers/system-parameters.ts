import type {
  SystemParameterInput,
  SystemParameterListResponse,
  SystemParameterRecord,
  SystemParameterStatus,
} from '@/features/system-parameters/types'
import type { ApiResponse } from '@/lib/http'
import { http, HttpResponse } from 'msw'
import { SYSTEM_PARAMETER_INPUT_SCHEMA } from '@/features/system-parameters/system-parameter-api-contracts'
import { SYSTEM_PARAMETER_STATUSES } from '@/features/system-parameters/types'
import { readMockJsonBody } from '@/mocks/request-validation'
import { authorizeMockPermission } from './auth'

const initialSystemParameters: SystemParameterRecord[] = [
  {
    id: 'parameter-1',
    key: 'system.default_page_size',
    value: '20',
    description: 'Default page size for administration lists.',
    status: 'active',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'parameter-2',
    key: 'security.password_expiry_days',
    value: '90',
    description: 'Password expiry window used by the identity service.',
    status: 'active',
    updatedAt: '2026-07-02T08:00:00.000Z',
  },
  {
    id: 'parameter-3',
    key: 'feature.legacy_export_enabled',
    value: 'false',
    description: 'Temporary compatibility switch for the legacy export workflow.',
    status: 'disabled',
    updatedAt: '2026-07-03T08:00:00.000Z',
  },
]

const systemParameters = initialSystemParameters.map((parameter) => ({ ...parameter }))
let nextSystemParameterId = 4
const MAX_MOCK_SYSTEM_PARAMETERS = 200

function copySystemParameter(parameter: SystemParameterRecord): SystemParameterRecord {
  return { ...parameter }
}

function findSystemParameter(
  parameterId: string | readonly string[],
): SystemParameterRecord | undefined {
  return systemParameters.find((parameter) => parameter.id === String(parameterId))
}

function getDuplicateSystemParameterResponse(): Response {
  return HttpResponse.json<ApiResponse<null>>(
    { code: 'SYSTEM_PARAMETER_KEY_EXISTS', message: '系统参数键已存在', data: null },
    { status: 409 },
  )
}

export function resetMockSystemParameters(): void {
  systemParameters.splice(
    0,
    systemParameters.length,
    ...initialSystemParameters.map((parameter) => ({ ...parameter })),
  )
  nextSystemParameterId = 4
}

export const listSystemParametersHandler = http.get('/api/system-parameters', ({ request }) => {
  const authorization = authorizeMockPermission(request, 'read', 'Settings')
  if (!authorization.isAuthenticated) return authorization.response

  const url = new URL(request.url)
  const keyword = url.searchParams.get('keyword')?.trim().toLowerCase() ?? ''
  const requestedStatus = url.searchParams.get('status')
  const status: SystemParameterStatus | undefined = SYSTEM_PARAMETER_STATUSES.find(
    (parameterStatus) => parameterStatus === requestedStatus,
  )
  const items = systemParameters
    .filter(
      (parameter) =>
        !keyword ||
        parameter.key.toLowerCase().includes(keyword) ||
        parameter.value.toLowerCase().includes(keyword) ||
        parameter.description.toLowerCase().includes(keyword),
    )
    .filter((parameter) => !status || parameter.status === status)
    .sort((leftParameter, rightParameter) => leftParameter.key.localeCompare(rightParameter.key))
    .map(copySystemParameter)

  return HttpResponse.json<ApiResponse<SystemParameterListResponse>>({
    code: 0,
    message: 'success',
    data: { items, total: items.length },
  })
})

export const createSystemParameterHandler = http.post<never, SystemParameterInput>(
  '/api/system-parameters',
  async ({ request }) => {
    const authorization = authorizeMockPermission(request, 'create', 'Settings')
    if (!authorization.isAuthenticated) return authorization.response

    const requestBody = await readMockJsonBody(request, SYSTEM_PARAMETER_INPUT_SCHEMA, {
      code: 'INVALID_SYSTEM_PARAMETER',
      message: '系统参数信息无效',
    })
    if (!requestBody.isValid) return requestBody.response
    const input = requestBody.body
    if (systemParameters.some((parameter) => parameter.key === input.key))
      return getDuplicateSystemParameterResponse()
    if (systemParameters.length >= MAX_MOCK_SYSTEM_PARAMETERS) {
      // AI modified: the mutable registry remains compatible with its bounded response schema.
      return HttpResponse.json<ApiResponse<null>>(
        {
          code: 'SYSTEM_PARAMETER_CAPACITY_REACHED',
          message: '系统参数数量已达到演示环境上限',
          data: null,
        },
        { status: 409 },
      )
    }

    const parameter: SystemParameterRecord = {
      id: `parameter-${nextSystemParameterId++}`,
      ...input,
      updatedAt: new Date().toISOString(),
    }
    systemParameters.push(parameter)

    return HttpResponse.json<ApiResponse<SystemParameterRecord>>({
      code: 0,
      message: 'created',
      data: copySystemParameter(parameter),
    })
  },
)

export const updateSystemParameterHandler = http.put<{ parameterId: string }, SystemParameterInput>(
  '/api/system-parameters/:parameterId',
  async ({ params, request }) => {
    const authorization = authorizeMockPermission(request, 'update', 'Settings')
    if (!authorization.isAuthenticated) return authorization.response

    const parameter = findSystemParameter(params.parameterId)
    if (!parameter) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'SYSTEM_PARAMETER_NOT_FOUND', message: '系统参数不存在', data: null },
        { status: 404 },
      )
    }

    const requestBody = await readMockJsonBody(request, SYSTEM_PARAMETER_INPUT_SCHEMA, {
      code: 'INVALID_SYSTEM_PARAMETER',
      message: '系统参数信息无效',
    })
    if (!requestBody.isValid) return requestBody.response
    const input = requestBody.body
    if (
      systemParameters.some(
        (candidate) => candidate.id !== parameter.id && candidate.key === input.key,
      )
    )
      return getDuplicateSystemParameterResponse()

    Object.assign(parameter, input, { updatedAt: new Date().toISOString() })
    return HttpResponse.json<ApiResponse<SystemParameterRecord>>({
      code: 0,
      message: 'updated',
      data: copySystemParameter(parameter),
    })
  },
)

export const deleteSystemParameterHandler = http.delete<{ parameterId: string }>(
  '/api/system-parameters/:parameterId',
  ({ params, request }) => {
    const authorization = authorizeMockPermission(request, 'delete', 'Settings')
    if (!authorization.isAuthenticated) return authorization.response

    const parameter = findSystemParameter(params.parameterId)
    if (!parameter) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'SYSTEM_PARAMETER_NOT_FOUND', message: '系统参数不存在', data: null },
        { status: 404 },
      )
    }

    systemParameters.splice(systemParameters.indexOf(parameter), 1)
    return HttpResponse.json<ApiResponse<null>>({ code: 0, message: 'deleted', data: null })
  },
)

export const systemParameterHandlers = [
  listSystemParametersHandler,
  createSystemParameterHandler,
  updateSystemParameterHandler,
  deleteSystemParameterHandler,
]
