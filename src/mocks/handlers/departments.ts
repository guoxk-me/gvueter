import type {
  DepartmentInput,
  DepartmentListResponse,
  DepartmentRecord,
} from '@/features/departments/types'
import type { ApiResponse } from '@/lib/http'
import { http, HttpResponse } from 'msw'
import { DEPARTMENT_INPUT_SCHEMA } from '@/features/departments/department-api-contracts'
import { getDepartmentDescendantIds } from '@/features/departments/department-tree'
import { mockUsers } from '@/mocks/data/users'
import { readMockJsonBody } from '@/mocks/request-validation'
import { authorizeMockPermission } from './auth'

const initialDepartments: DepartmentRecord[] = [
  { id: 'company', name: 'GVUETER', parentId: null, order: 10, status: 'active' },
  { id: 'product', name: 'Product', parentId: 'company', order: 10, status: 'active' },
  { id: 'product-design', name: 'Design', parentId: 'product', order: 10, status: 'active' },
  {
    id: 'product-engineering',
    name: 'Engineering',
    parentId: 'product',
    order: 20,
    status: 'active',
  },
  // AI modified: the fourth level makes data-scope and hierarchy examples representative of large organizations.
  {
    id: 'product-engineering-platform',
    name: 'Platform Security',
    parentId: 'product-engineering',
    order: 10,
    status: 'active',
  },
  { id: 'operations', name: 'Operations', parentId: 'company', order: 20, status: 'active' },
  { id: 'finance', name: 'Finance', parentId: 'company', order: 30, status: 'active' },
  {
    id: 'human-resources',
    name: 'Human Resources',
    parentId: 'company',
    order: 40,
    status: 'disabled',
  },
]

const mockDepartments = initialDepartments.map((department) => ({ ...department }))
let nextDepartmentId = 1
const MAX_MOCK_DEPARTMENTS = 500

function copyDepartment(department: DepartmentRecord): DepartmentRecord {
  return { ...department }
}

function getInputFailure(message: string, code = 'INVALID_DEPARTMENT', status = 400) {
  return HttpResponse.json<ApiResponse<null>>({ code, message, data: null }, { status })
}

function getDepartment(departmentId: string | readonly string[]): DepartmentRecord | undefined {
  return mockDepartments.find((department) => department.id === String(departmentId))
}

export function getMockDepartmentIds(): string[] {
  return mockDepartments.map((department) => department.id)
}

export function getMockDepartmentSnapshot(): DepartmentRecord[] {
  return mockDepartments.map(copyDepartment)
}

export function resetMockDepartments(): void {
  mockDepartments.splice(
    0,
    mockDepartments.length,
    ...initialDepartments.map((department) => ({ ...department })),
  )
  nextDepartmentId = 1
}

export const listDepartmentsHandler = http.get('/api/departments', ({ request }) => {
  const authentication = authorizeMockPermission(request, 'read', 'Settings')
  if (!authentication.isAuthenticated) return authentication.response

  return HttpResponse.json<ApiResponse<DepartmentListResponse>>({
    code: 0,
    message: 'success',
    data: { items: mockDepartments.map(copyDepartment) },
  })
})

export const createDepartmentHandler = http.post<never, DepartmentInput>(
  '/api/departments',
  async ({ request }) => {
    // AI modified: Settings CRUD follows action-level role grants rather than the admin role name.
    const authentication = authorizeMockPermission(request, 'create', 'Settings')
    if (!authentication.isAuthenticated) return authentication.response

    const requestBody = await readMockJsonBody(request, DEPARTMENT_INPUT_SCHEMA, {
      code: 'INVALID_DEPARTMENT',
      message: '部门信息不完整',
    })
    if (!requestBody.isValid) return requestBody.response
    const input = requestBody.body
    if (input.parentId && !getDepartment(input.parentId))
      return getInputFailure('上级部门不存在', 'DEPARTMENT_PARENT_NOT_FOUND')
    if (mockDepartments.length >= MAX_MOCK_DEPARTMENTS) {
      // AI modified: the hierarchy cannot exceed the bounded department response contract.
      return getInputFailure('部门数量已达到演示环境上限', 'DEPARTMENT_CAPACITY_REACHED', 409)
    }

    const department: DepartmentRecord = {
      id: `department-${nextDepartmentId++}`,
      name: input.name.trim(),
      parentId: input.parentId,
      order: input.order,
      status: input.status,
    }
    mockDepartments.push(department)

    return HttpResponse.json<ApiResponse<DepartmentRecord>>({
      code: 0,
      message: 'created',
      data: copyDepartment(department),
    })
  },
)

export const updateDepartmentHandler = http.put<{ departmentId: string }, DepartmentInput>(
  '/api/departments/:departmentId',
  async ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'update', 'Settings')
    if (!authentication.isAuthenticated) return authentication.response

    const department = getDepartment(params.departmentId)
    if (!department) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'DEPARTMENT_NOT_FOUND', message: '部门不存在', data: null },
        { status: 404 },
      )
    }

    const requestBody = await readMockJsonBody(request, DEPARTMENT_INPUT_SCHEMA, {
      code: 'INVALID_DEPARTMENT',
      message: '部门信息不完整',
    })
    if (!requestBody.isValid) return requestBody.response
    const input = requestBody.body
    if (input.parentId && !getDepartment(input.parentId))
      return getInputFailure('上级部门不存在', 'DEPARTMENT_PARENT_NOT_FOUND')

    const descendantIds = getDepartmentDescendantIds(mockDepartments, department.id)
    if (input.parentId === department.id || (input.parentId && descendantIds.has(input.parentId))) {
      // AI modified: reject cyclic parent changes at the backend contract, not only in the form.
      return getInputFailure('不能把部门移动到自身或下级部门', 'DEPARTMENT_CYCLE')
    }

    department.name = input.name.trim()
    department.parentId = input.parentId
    department.order = input.order
    department.status = input.status

    return HttpResponse.json<ApiResponse<DepartmentRecord>>({
      code: 0,
      message: 'updated',
      data: copyDepartment(department),
    })
  },
)

export const deleteDepartmentHandler = http.delete<{ departmentId: string }>(
  '/api/departments/:departmentId',
  ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'delete', 'Settings')
    if (!authentication.isAuthenticated) return authentication.response

    const department = getDepartment(params.departmentId)
    if (!department) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'DEPARTMENT_NOT_FOUND', message: '部门不存在', data: null },
        { status: 404 },
      )
    }
    if (mockDepartments.some((candidate) => candidate.parentId === department.id)) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'DEPARTMENT_HAS_CHILDREN', message: '请先处理下级部门', data: null },
        { status: 409 },
      )
    }
    if (mockUsers.some((user) => user.departmentId === department.id)) {
      // AI modified: preserve referential integrity so data-scope principals never become orphaned.
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'DEPARTMENT_HAS_USERS', message: '请先调整部门成员', data: null },
        { status: 409 },
      )
    }

    mockDepartments.splice(mockDepartments.indexOf(department), 1)
    return HttpResponse.json<ApiResponse<null>>({ code: 0, message: 'deleted', data: null })
  },
)

export const departmentHandlers = [
  listDepartmentsHandler,
  createDepartmentHandler,
  updateDepartmentHandler,
  deleteDepartmentHandler,
]
