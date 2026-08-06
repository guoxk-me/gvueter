import type {
  DepartmentInput,
  DepartmentListResponse,
  DepartmentRecord,
} from '@/features/departments/types'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { getDepartmentTree } from '@/features/departments/department-tree'
import { del, get, post, put } from '@/lib/http'
import { generateMockToken } from '@/mocks/data/users'
import { resetMockDepartments } from '@/mocks/handlers/departments'

const newDepartment: DepartmentInput = {
  name: 'Customer Success',
  parentId: 'operations',
  order: 15,
  status: 'active',
}

describe('department management', () => {
  beforeEach(() => {
    resetMockDepartments()
    localStorage.removeItem('auth_token')
    sessionStorage.setItem('auth_token', generateMockToken(1))
  })
  afterEach(() => {
    localStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_token')
  })

  it('resolves ordered parent and child branches from the flat API contract', async () => {
    const response = await get<DepartmentListResponse>('/departments')
    const tree = getDepartmentTree(response.items)

    expect(tree.map((department) => department.id)).toEqual(['company'])
    expect(tree[0]?.children.map((department) => department.id)).toEqual([
      'product',
      'operations',
      'finance',
      'human-resources',
    ])
    expect(tree[0]?.children[0]?.children.map((department) => department.id)).toEqual([
      'product-design',
      'product-engineering',
    ])
    expect(tree[0]?.children[0]?.children[1]?.children.map((department) => department.id)).toEqual([
      'product-engineering-platform',
    ])
  })

  it('creates, updates, and deletes a leaf department', async () => {
    const createdDepartment = await post<DepartmentRecord>('/departments', newDepartment)
    expect(createdDepartment).toMatchObject(newDepartment)

    const updatedDepartment = await put<DepartmentRecord>(`/departments/${createdDepartment.id}`, {
      ...newDepartment,
      name: 'Client Success',
      parentId: 'company',
    })
    expect(updatedDepartment).toMatchObject({ name: 'Client Success', parentId: 'company' })

    await del(`/departments/${createdDepartment.id}`)
    const response = await get<DepartmentListResponse>('/departments')
    expect(response.items.some((department) => department.id === createdDepartment.id)).toBe(false)
  })

  it('rejects cyclic moves and non-admin writes at the API boundary', async () => {
    await expect(
      put('/departments/company', {
        name: 'GVUETER',
        parentId: 'product',
        order: 10,
        status: 'active',
      }),
    ).rejects.toMatchObject({ code: 'DEPARTMENT_CYCLE', status: 400 })

    sessionStorage.setItem('auth_token', generateMockToken(2))
    await expect(post('/departments', newDepartment)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
  })

  it('rejects deleting a department assigned to users', async () => {
    await expect(del('/departments/finance')).rejects.toMatchObject({
      code: 'DEPARTMENT_HAS_USERS',
      status: 409,
    })

    await expect(del('/departments/human-resources')).resolves.toBeNull()
  })
})
