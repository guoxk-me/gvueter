import type {
  PositionInput,
  PositionListResponse,
  PositionRecord,
  PositionStatus,
} from '@/features/positions/types'
import type { ApiResponse } from '@/lib/http'
import { http, HttpResponse } from 'msw'
import { POSITION_INPUT_SCHEMA } from '@/features/positions/position-api-contracts'
import { POSITION_STATUSES } from '@/features/positions/types'
import { readMockJsonBody } from '@/mocks/request-validation'
import { authorizeMockPermission } from './auth'

const initialPositions: PositionRecord[] = [
  {
    id: 'position-1',
    code: 'product-manager',
    name: 'Product Manager',
    description: 'Owns product outcomes.',
    order: 10,
    status: 'active',
  },
  {
    id: 'position-2',
    code: 'frontend-engineer',
    name: 'Frontend Engineer',
    description: 'Builds administration experiences.',
    order: 20,
    status: 'active',
  },
  {
    id: 'position-3',
    code: 'finance-specialist',
    name: 'Finance Specialist',
    description: 'Maintains financial controls.',
    order: 30,
    status: 'active',
  },
  {
    id: 'position-4',
    code: 'legacy-operator',
    name: 'Legacy Operator',
    description: 'Retained for historical assignments.',
    order: 40,
    status: 'disabled',
  },
]

const mockPositions = initialPositions.map((position) => ({ ...position }))
let nextPositionId = 5
const MAX_MOCK_POSITIONS = 200

function copyPosition(position: PositionRecord): PositionRecord {
  return { ...position }
}

function getPosition(positionId: string | readonly string[]): PositionRecord | undefined {
  return mockPositions.find((position) => position.id === String(positionId))
}

export function resetMockPositions(): void {
  mockPositions.splice(
    0,
    mockPositions.length,
    ...initialPositions.map((position) => ({ ...position })),
  )
  nextPositionId = 5
}

export const listPositionsHandler = http.get('/api/positions', ({ request }) => {
  const authentication = authorizeMockPermission(request, 'read', 'Settings')
  if (!authentication.isAuthenticated) return authentication.response

  const url = new URL(request.url)
  const keyword = url.searchParams.get('keyword')?.trim().toLowerCase() ?? ''
  const requestedStatus = url.searchParams.get('status')
  const status: PositionStatus | undefined = POSITION_STATUSES.find(
    (positionStatus) => positionStatus === requestedStatus,
  )
  const items = mockPositions
    .filter(
      (position) =>
        !keyword ||
        position.name.toLowerCase().includes(keyword) ||
        position.code.toLowerCase().includes(keyword),
    )
    .filter((position) => !status || position.status === status)
    .sort((leftPosition, rightPosition) => leftPosition.order - rightPosition.order)
    .map(copyPosition)

  return HttpResponse.json<ApiResponse<PositionListResponse>>({
    code: 0,
    message: 'success',
    data: { items, total: items.length },
  })
})

export const createPositionHandler = http.post<never, PositionInput>(
  '/api/positions',
  async ({ request }) => {
    // AI modified: Settings CRUD follows action-level role grants rather than the admin role name.
    const authentication = authorizeMockPermission(request, 'create', 'Settings')
    if (!authentication.isAuthenticated) return authentication.response

    const requestBody = await readMockJsonBody(request, POSITION_INPUT_SCHEMA, {
      code: 'INVALID_POSITION',
      message: '岗位信息无效',
    })
    if (!requestBody.isValid) return requestBody.response
    const input = requestBody.body
    const code = input.code.trim().toLowerCase()
    if (mockPositions.some((position) => position.code === code)) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'POSITION_CODE_EXISTS', message: '岗位编码已存在', data: null },
        { status: 409 },
      )
    }
    if (mockPositions.length >= MAX_MOCK_POSITIONS) {
      // AI modified: repeated demo writes cannot make the list violate its response schema.
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'POSITION_CAPACITY_REACHED', message: '岗位数量已达到演示环境上限', data: null },
        { status: 409 },
      )
    }

    const position: PositionRecord = {
      id: `position-${nextPositionId++}`,
      code,
      name: input.name.trim(),
      description: input.description.trim(),
      order: input.order,
      status: input.status,
    }
    mockPositions.push(position)
    return HttpResponse.json<ApiResponse<PositionRecord>>({
      code: 0,
      message: 'created',
      data: copyPosition(position),
    })
  },
)

export const updatePositionHandler = http.put<{ positionId: string }, PositionInput>(
  '/api/positions/:positionId',
  async ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'update', 'Settings')
    if (!authentication.isAuthenticated) return authentication.response

    const position = getPosition(params.positionId)
    if (!position) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'POSITION_NOT_FOUND', message: '岗位不存在', data: null },
        { status: 404 },
      )
    }

    const requestBody = await readMockJsonBody(request, POSITION_INPUT_SCHEMA, {
      code: 'INVALID_POSITION',
      message: '岗位信息无效',
    })
    if (!requestBody.isValid) return requestBody.response
    const input = requestBody.body
    const code = input.code.trim().toLowerCase()
    if (
      mockPositions.some((candidate) => candidate.id !== position.id && candidate.code === code)
    ) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'POSITION_CODE_EXISTS', message: '岗位编码已存在', data: null },
        { status: 409 },
      )
    }

    position.code = code
    position.name = input.name.trim()
    position.description = input.description.trim()
    position.order = input.order
    position.status = input.status
    return HttpResponse.json<ApiResponse<PositionRecord>>({
      code: 0,
      message: 'updated',
      data: copyPosition(position),
    })
  },
)

export const deletePositionHandler = http.delete<{ positionId: string }>(
  '/api/positions/:positionId',
  ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'delete', 'Settings')
    if (!authentication.isAuthenticated) return authentication.response

    const position = getPosition(params.positionId)
    if (!position) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'POSITION_NOT_FOUND', message: '岗位不存在', data: null },
        { status: 404 },
      )
    }

    mockPositions.splice(mockPositions.indexOf(position), 1)
    return HttpResponse.json<ApiResponse<null>>({ code: 0, message: 'deleted', data: null })
  },
)

export const positionHandlers = [
  listPositionsHandler,
  createPositionHandler,
  updatePositionHandler,
  deletePositionHandler,
]
