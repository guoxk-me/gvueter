import type { RoleListResponse } from '@/features/roles/types'
import type { ApiResponse } from '@/lib/http'
import { http, HttpResponse } from 'msw'
import { UPDATE_ROLE_POLICY_INPUT_SCHEMA } from '@/features/roles/role-api-contracts'
import {
  getRoleDefinitions,
  hasAdminRoleRecoveryPermissions,
  isRoleKey,
  isRolePermission,
  updateRolePolicy,
} from '@/features/roles/role-policy'
import { readMockJsonBody } from '@/mocks/request-validation'
import { authorizeMockPermission } from './auth'
import { getMockDepartmentIds, getMockDepartmentSnapshot } from './departments'
import { recordMockOperation } from './operation-logs'

export const listRolesHandler = http.get('/api/roles', ({ request }) => {
  const authentication = authorizeMockPermission(request, 'read', 'RolePolicy')
  if (!authentication.isAuthenticated)
    return authentication.response

  return HttpResponse.json<ApiResponse<RoleListResponse>>({
    code: 0,
    message: 'success',
    data: {
      items: getRoleDefinitions(),
      // AI modified: scope options travel with the protected role-policy contract.
      scopeDepartments: getMockDepartmentSnapshot(),
    },
  })
})

export const updateRolePermissionsHandler = http.put<{ roleKey: string }, Record<string, unknown>>(
  '/api/roles/:roleKey',
  async ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'update', 'RolePolicy')
    if (!authentication.isAuthenticated)
      return authentication.response

    if (!isRoleKey(params.roleKey)) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'ROLE_NOT_FOUND', message: '角色不存在', data: null },
        { status: 404 },
      )
    }
    const requestBody = await readMockJsonBody(request, UPDATE_ROLE_POLICY_INPUT_SCHEMA, {
      code: 'INVALID_ROLE_POLICY',
      message: '角色策略无效',
    })
    if (!requestBody.isValid)
      return requestBody.response
    const input = requestBody.body
    const permissionKeys = new Set(
      input.permissions.map(permission => `${permission.action}:${permission.subject}`),
    )
    const hasInvalidPermissions
      = input.permissions.some(permission => !isRolePermission(permission))
        || permissionKeys.size !== input.permissions.length
    if (hasInvalidPermissions) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'INVALID_PERMISSION_SET', message: '权限配置无效', data: null },
        { status: 400 },
      )
    }
    // AI modified: reject policies that would remove the built-in administrator's recovery path.
    if (!hasAdminRoleRecoveryPermissions(params.roleKey, input.permissions)) {
      return HttpResponse.json<ApiResponse<null>>(
        {
          code: 'ADMIN_ROLE_RECOVERY_REQUIRED',
          message: '内置管理员必须保留角色策略的查看和编辑权限',
          data: null,
        },
        { status: 409 },
      )
    }

    const departmentIds = input.dataScope.departmentIds ?? []
    const availableDepartmentIds = new Set(getMockDepartmentIds())
    const hasInvalidDataScope
      = input.dataScope.scope === 'custom'
        ? departmentIds.length === 0
        || new Set(departmentIds).size !== departmentIds.length
        || departmentIds.some(departmentId => !availableDepartmentIds.has(departmentId))
        : departmentIds.length > 0
    if (hasInvalidDataScope) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'INVALID_DATA_SCOPE', message: '数据范围配置无效', data: null },
        { status: 400 },
      )
    }

    // AI modified: permissions and record scope are one policy transaction at the API boundary.
    const role = updateRolePolicy(params.roleKey, {
      permissions: input.permissions,
      dataScope:
        input.dataScope.scope === 'custom'
          ? { scope: 'custom', departmentIds }
          : { scope: input.dataScope.scope },
    })
    if (!role) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'ROLE_NOT_FOUND', message: '角色不存在', data: null },
        { status: 404 },
      )
    }

    recordMockOperation(authentication.user, {
      action: 'update',
      resource: 'role-policy',
      summary: `Updated role policy ${role.key}.`,
    })

    return HttpResponse.json<ApiResponse<typeof role>>({
      code: 0,
      message: 'updated',
      data: role,
    })
  },
)

export const roleHandlers = [listRolesHandler, updateRolePermissionsHandler]
