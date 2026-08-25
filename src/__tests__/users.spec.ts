import type { SystemConfig, SystemConfigInput } from '@/features/system-config/types'
import type { AdminUser, UserImportResponse, UserListResponse } from '@/features/users/types'
import { File as NodeFile } from 'node:buffer'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { http, HttpResponse } from 'msw'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  ADMIN_USER_SCHEMA,
  USER_IMPORT_RESPONSE_SCHEMA,
  USER_LIST_RESPONSE_SCHEMA,
} from '@/features/users/user-api-contracts'
import { i18n, setLocale } from '@/i18n'
import { updateAbility } from '@/lib/ability'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel } from '@/lib/display-format'
import { del, get, post, put, uploadFileBytes } from '@/lib/http'
import { generateMockToken } from '@/mocks/data/users'
import { resetMockSystemConfig } from '@/mocks/handlers/system-config'
import { server } from '@/mocks/node'
import UsersPage from '@/pages/admin/UsersPage.vue'
import { useAuthStore } from '@/stores/auth'
import { getTestAuthorization } from './auth-test-helpers'

vi.mock('vue-sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('user management API', () => {
  beforeEach(() => {
    // AI modified: CSV scenarios start from the default global upload policy.
    resetMockSystemConfig()
    sessionStorage.setItem('auth_token', generateMockToken(1))
  })
  afterEach(() => sessionStorage.removeItem('auth_token'))

  it('filters users by keyword, role, and status', async () => {
    const users = await get<UserListResponse>('/users', {
      keyword: 'admin',
      role: 'admin',
      status: 'active',
    })

    expect(users.total).toBe(1)
    expect(users.items[0]).toMatchObject({
      email: 'admin@example.com',
      role: 'admin',
    })
  })

  it('rejects malformed list and mutation success payloads', async () => {
    server.use(
      http.get('/api/users', () =>
        HttpResponse.json({
          code: 0,
          message: 'success',
          data: { items: [{ id: 'admin', role: 'owner' }], total: '1', page: 1, pageSize: 10 },
        })),
      http.post('/api/users', () =>
        HttpResponse.json({
          code: 0,
          message: 'created',
          data: { id: 99, name: 'Missing fields' },
        })),
    )

    // AI modified: successful business codes cannot bypass user DTO validation.
    await expect(
      get<UserListResponse>('/users', undefined, { responseSchema: USER_LIST_RESPONSE_SCHEMA }),
    ).rejects.toMatchObject({
      code: 'INVALID_API_RESPONSE_DATA',
      category: 'contract',
    })
    await expect(
      post<AdminUser>(
        '/users',
        {
          name: 'Contract test',
          email: 'contract.test@example.com',
          role: 'viewer',
          status: 'active',
          temporaryPassword: 'ChangeMe123!',
        },
        { responseSchema: ADMIN_USER_SCHEMA },
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_API_RESPONSE_DATA',
      category: 'contract',
    })
  })

  it('applies stable server sorting and pagination metadata', async () => {
    const firstPage = await get<UserListResponse>('/users', {
      page: 1,
      pageSize: 3,
      sortField: 'name',
      sortDirection: 'asc',
    })
    const secondPage = await get<UserListResponse>('/users', {
      page: 2,
      pageSize: 3,
      sortField: 'name',
      sortDirection: 'asc',
    })

    expect(firstPage).toMatchObject({ page: 1, pageSize: 3, total: 8 })
    expect(firstPage.items).toHaveLength(3)
    expect(secondPage).toMatchObject({ page: 2, pageSize: 3, total: 8 })
    expect(secondPage.items).toHaveLength(3)
    expect(firstPage.items.map(user => user.id)).not.toEqual(
      secondPage.items.map(user => user.id),
    )
    expect(
      firstPage.items.map(user => user.name).sort((left, right) => left.localeCompare(right)),
    ).toEqual(firstPage.items.map(user => user.name))
  })

  it('serves a long English identity with an empty avatar and an offset date boundary', async () => {
    const users = await get<UserListResponse>('/users', { keyword: 'montgomery-whittaker' })
    const edgeUser = users.items[0]

    expect(users.total).toBe(1)
    expect(edgeUser).toMatchObject({
      name: 'Alexandria Catherine Montgomery-Whittaker Global Operations Reviewer',
      departmentPath: 'company/finance',
    })
    expect(edgeUser?.name.length).toBeGreaterThan(60)
    expect(edgeUser?.email.length).toBeGreaterThan(90)
    expect(edgeUser?.avatar).toBeUndefined()
    expect(
      getDateTimeLabel(edgeUser?.createdAt, {
        locale: 'en-US',
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }),
    ).toBe('06/30/2026, 16:30')
    expect(
      getDateTimeLabel(edgeUser?.createdAt, {
        locale: 'zh-CN',
        timeZone: ADMIN_DISPLAY_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }),
    ).toBe('2026/07/01 00:30')
  })

  it('creates, updates, and deletes a user', async () => {
    const adminToken = sessionStorage.getItem('auth_token')
    const createdUser = await post<AdminUser>('/users', {
      name: '测试用户',
      email: 'test.user@example.com',
      role: 'viewer',
      status: 'active',
      temporaryPassword: 'ChangeMe123!',
    })

    expect(createdUser).toMatchObject({
      name: '测试用户',
      email: 'test.user@example.com',
      role: 'viewer',
      status: 'active',
    })
    const createdUserToken = generateMockToken(createdUser.id)

    const updatedUser = await put<AdminUser>(`/users/${createdUser.id}`, {
      name: '已更新用户',
      email: 'updated.user@example.com',
      role: 'editor',
      status: 'suspended',
    })

    expect(updatedUser).toMatchObject({
      name: '已更新用户',
      email: 'updated.user@example.com',
      role: 'editor',
      status: 'suspended',
    })

    sessionStorage.setItem('auth_token', createdUserToken)
    await expect(get('/auth/me')).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
      status: 401,
    })

    if (!adminToken)
      throw new Error('The test administrator session was not initialized')
    sessionStorage.setItem('auth_token', adminToken)
    await put<AdminUser>(`/users/${createdUser.id}`, {
      name: '已更新用户',
      email: 'updated.user@example.com',
      role: 'editor',
      status: 'active',
    })

    sessionStorage.setItem('auth_token', createdUserToken)
    // AI modified: reactivating the account does not resurrect a session revoked by suspension.
    await expect(get('/auth/me')).rejects.toMatchObject({ code: 'INVALID_TOKEN', status: 401 })

    sessionStorage.setItem('auth_token', adminToken)
    await del(`/users/${createdUser.id}`)
    const users = await get<UserListResponse>('/users', { keyword: 'updated.user' })
    expect(users.total).toBe(0)
  })

  it('repeats temporary-password strength checks at the user API boundary', async () => {
    await expect(
      post('/users', {
        name: 'Weak password user',
        email: 'weak.password@example.com',
        role: 'viewer',
        status: 'active',
        temporaryPassword: 'password',
      }),
    ).rejects.toMatchObject({ code: 'WEAK_TEMPORARY_PASSWORD', status: 400 })
  })

  it('protects the current principal and the last active administrator', async () => {
    const administratorUpdate = {
      name: '超级管理员',
      email: 'admin@example.com',
      role: 'viewer',
      status: 'active',
    }

    await expect(put('/users/1', administratorUpdate)).rejects.toMatchObject({
      code: 'LAST_ACTIVE_ADMIN_REQUIRED',
      status: 409,
    })
    await expect(del('/users/1')).rejects.toMatchObject({
      code: 'LAST_ACTIVE_ADMIN_REQUIRED',
      status: 409,
    })

    const secondAdministrator = await post<AdminUser>('/users', {
      name: 'Backup administrator',
      email: 'backup.admin@example.com',
      role: 'admin',
      status: 'active',
      temporaryPassword: 'ChangeMe123!',
    })
    await expect(put('/users/1', administratorUpdate)).rejects.toMatchObject({
      code: 'SELF_SECURITY_CHANGE_FORBIDDEN',
      status: 403,
    })
    await expect(del('/users/1')).rejects.toMatchObject({
      code: 'SELF_DELETE_FORBIDDEN',
      status: 403,
    })

    sessionStorage.setItem('auth_token', generateMockToken(secondAdministrator.id))
    await del('/users/1')
    await expect(del(`/users/${secondAdministrator.id}`)).rejects.toMatchObject({
      code: 'LAST_ACTIVE_ADMIN_REQUIRED',
      status: 409,
    })
  })

  it('applies backend department-tree scope and rejects users without read permission', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(2))
    const editorUsers = await get<UserListResponse>('/users')

    expect(editorUsers.items.map(user => user.id).sort()).toEqual([2, 4, 5, 7])
    // AI modified: privacy is enforced by the response contract, not only by table rendering.
    expect(editorUsers.items.every(user => user.email.includes('***'))).toBe(true)
    expect(editorUsers.items.every(user => user.avatar === undefined)).toBe(true)
    expect(editorUsers.items.every(user => user.departmentId === undefined)).toBe(true)
    expect(editorUsers.items.every(user => user.departmentPath === undefined)).toBe(true)
    expect(JSON.stringify(editorUsers)).not.toContain('editor@example.com')

    const hiddenEmailSearch = await get<UserListResponse>('/users', {
      keyword: 'siyuan.chen@example.com',
    })
    expect(hiddenEmailSearch.total).toBe(0)

    sessionStorage.setItem('auth_token', generateMockToken(1))
    const privilegedEmailSearch = await get<UserListResponse>('/users', {
      keyword: 'siyuan.chen@example.com',
    })
    expect(privilegedEmailSearch.total).toBe(1)

    sessionStorage.setItem('auth_token', generateMockToken(3))
    await expect(get<UserListResponse>('/users')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
  })

  it('recomputes department-tree authorization after departments move', async () => {
    await put('/roles/editor', {
      permissions: [
        { action: 'read', subject: 'User' },
        { action: 'update', subject: 'User' },
        { action: 'delete', subject: 'User' },
      ],
      dataScope: { scope: 'departmentTree' },
    })
    await put('/departments/product-design', {
      name: 'Design',
      parentId: 'finance',
      order: 10,
      status: 'active',
    })
    await put('/departments/operations', {
      name: 'Operations',
      parentId: 'product',
      order: 20,
      status: 'active',
    })

    sessionStorage.setItem('auth_token', generateMockToken(2))
    const editorUsers = await get<UserListResponse>('/users')

    // AI modified: stale departmentPath values neither retain nor suppress current tree membership.
    expect(editorUsers.items.map(user => user.id).sort()).toEqual([2, 5, 6, 7])
    await expect(
      put('/users/4', {
        name: '林晓月',
        email: 'xiaoyue.lin@example.com',
        role: 'viewer',
        status: 'active',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 })
    await expect(del('/users/4')).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 })
  })

  it('imports UTF-8 CSV bytes and reports invalid or duplicate rows', async () => {
    const csv = [
      '\uFEFFname,email,role,status',
      '"Avery, Zhang",avery.import@example.com,viewer,active',
      'Duplicate,ADMIN@example.com,viewer,active',
      '  =unsafe,formula@example.com,viewer,active',
      'Jordan,jordan.import@example.com,editor,suspended',
      'Repeated,JORDAN.IMPORT@example.com,viewer,active',
      'Unknown role,unknown.role@example.com,owner,active',
    ].join('\r\n')

    const summary = await uploadFileBytes<UserImportResponse>(
      '/users/import',
      new NodeFile([csv], 'users.csv', { type: 'text/csv' }),
      { responseSchema: USER_IMPORT_RESPONSE_SCHEMA },
    )

    expect(summary).toMatchObject({ createdCount: 2, skippedCount: 4 })
    expect(summary.issues).toEqual([
      { row: 3, code: 'DUPLICATE_EMAIL' },
      { row: 4, code: 'UNSAFE_SPREADSHEET_VALUE' },
      { row: 6, code: 'DUPLICATE_EMAIL' },
      { row: 7, code: 'INVALID_ROLE' },
    ])

    const importedUsers = await get<UserListResponse>('/users', { keyword: 'import@example.com' })
    expect(importedUsers.items.map(user => user.name).sort()).toEqual(['Avery, Zhang', 'Jordan'])
  })

  it('rejects CSV import when the administrator disables csv globally', async () => {
    const currentConfig = await get<SystemConfig>('/system-config')
    await put('/system-config', {
      site: { ...currentConfig.site },
      upload: {
        provider: currentConfig.upload.provider,
        maxFileSizeMb: currentConfig.upload.maxFileSizeMb,
        allowedExtensions: 'png',
        endpointUrl: currentConfig.upload.endpointUrl,
        region: currentConfig.upload.region,
        bucketName: currentConfig.upload.bucketName,
        pathPrefix: currentConfig.upload.pathPrefix,
        isPathStyle: currentConfig.upload.isPathStyle,
        publicBaseUrl: currentConfig.upload.publicBaseUrl,
        accessKeyId: currentConfig.upload.accessKeyId,
        accessKeySecret: '',
      },
      sms: {
        provider: currentConfig.sms.provider,
        senderName: currentConfig.sms.senderName,
        accessKeyId: currentConfig.sms.accessKeyId,
        accessKeySecret: '',
      },
      email: {
        host: currentConfig.email.host,
        port: currentConfig.email.port,
        isSecure: currentConfig.email.isSecure,
        username: currentConfig.email.username,
        password: '',
        fromName: currentConfig.email.fromName,
        fromAddress: currentConfig.email.fromAddress,
      },
      thirdParty: {
        isSsoEnabled: currentConfig.thirdParty.isSsoEnabled,
        oauthClientId: currentConfig.thirdParty.oauthClientId,
        oauthClientSecret: '',
        webhookUrl: currentConfig.thirdParty.webhookUrl,
        webhookSigningSecret: '',
      },
    } satisfies SystemConfigInput)

    // AI modified: direct import requests cannot bypass the saved extension allow-list.
    await expect(
      uploadFileBytes(
        '/users/import',
        new NodeFile(
          ['name,email,role,status\nDisabled CSV,disabled.csv@example.com,viewer,active'],
          'users.csv',
          { type: 'text/csv' },
        ),
      ),
    ).rejects.toMatchObject({ code: 'USER_IMPORT_EXTENSION_DISABLED', status: 415 })
  })

  it('rejects malformed headers, invalid UTF-8, and oversized imports', async () => {
    await expect(
      uploadFileBytes(
        '/users/import',
        new NodeFile(['email,name,role,status\nuser@example.com,User,viewer,active'], 'users.csv', {
          type: 'text/csv',
        }),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_USER_IMPORT_HEADER', status: 400 })

    await expect(
      uploadFileBytes(
        '/users/import',
        new NodeFile([new Uint8Array([0xC3, 0x28])], 'users.csv', { type: 'text/csv' }),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_USER_IMPORT_ENCODING', status: 400 })

    await expect(
      uploadFileBytes(
        '/users/import',
        new NodeFile([new Uint8Array(256 * 1024 + 1)], 'users.csv', { type: 'text/csv' }),
      ),
    ).rejects.toMatchObject({ code: 'USER_IMPORT_FILE_TOO_LARGE', status: 413 })
  })

  it('rejects non-admin imports without changing the user collection', async () => {
    const beforeImport = await get<UserListResponse>('/users')
    sessionStorage.setItem('auth_token', generateMockToken(2))

    await expect(
      uploadFileBytes(
        '/users/import',
        new NodeFile(
          ['name,email,role,status\nNo Access,no.access@example.com,viewer,active'],
          'users.csv',
          {
            type: 'text/csv',
          },
        ),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 })

    sessionStorage.setItem('auth_token', generateMockToken(1))
    const afterImport = await get<UserListResponse>('/users')
    expect(afterImport.total).toBe(beforeImport.total)
  })
})

describe('user deletion workflow', () => {
  const adminUser: AdminUser = {
    id: 1,
    name: 'Admin',
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
    createdAt: '2026-01-01T08:00:00.000Z',
  }

  beforeEach(() => {
    setLocale('en-US')
    resetMockSystemConfig()
    sessionStorage.setItem('auth_token', generateMockToken(1))
    updateAbility(adminUser, getTestAuthorization(adminUser))
    vi.clearAllMocks()
  })

  afterEach(() => {
    updateAbility(null)
    sessionStorage.removeItem('auth_token')
  })

  it('surfaces malformed list data as a contract error before rendering rows', async () => {
    server.use(
      http.get('/api/users', () =>
        HttpResponse.json({
          code: 0,
          message: 'success',
          data: { items: [{ id: 'admin', role: 'owner' }], total: '1', page: 1, pageSize: 5 },
        })),
    )
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/users', component: { template: '<div />' } }],
    })
    await router.push('/users')
    await router.isReady()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const wrapper = mount(UsersPage, {
      global: {
        plugins: [createPinia(), router, i18n, [VueQueryPlugin, { queryClient }]],
        stubs: {
          ImportDialog: true,
          UserDeleteDialog: true,
          UserFormDialog: true,
          UserTable: true,
          UserToolbar: true,
        },
      },
    })

    await flushPromises()

    // AI modified: UsersPage consumes only a validated list contract, never the malformed rows.
    expect(wrapper.text()).toContain('The API response data does not match the endpoint contract')

    wrapper.unmount()
    queryClient.clear()
  })

  it('retries a failed upload policy before opening the import dialog', async () => {
    let policyRequestCount = 0
    server.use(
      http.get('/api/uploads/policy', () => {
        policyRequestCount += 1
        if (policyRequestCount === 1) {
          return HttpResponse.json(
            { code: 'UPLOAD_POLICY_UNAVAILABLE', message: 'Policy unavailable', data: null },
            { status: 503 },
          )
        }
        return HttpResponse.json({
          code: 0,
          message: 'success',
          data: {
            maxFileSizeBytes: 20 * 1024 * 1024,
            allowedExtensions: ['csv'],
            updatedAt: '2026-07-29T00:00:00.000Z',
          },
        })
      }),
    )
    const UserTableStub = defineComponent({
      name: 'UserTable',
      props: {
        isImportDisabled: { type: Boolean, required: true },
      },
      emits: ['import'],
      template:
        '<button data-open-import :disabled="isImportDisabled" @click="$emit(\'import\')">Import</button>',
    })
    const ImportDialogStub = defineComponent({
      name: 'ImportDialog',
      props: { open: { type: Boolean, required: true } },
      template: '<div v-if="open" data-import-dialog />',
    })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/users', component: { template: '<div />' } }],
    })
    await router.push('/users')
    await router.isReady()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const wrapper = mount(UsersPage, {
      global: {
        plugins: [createPinia(), router, i18n, [VueQueryPlugin, { queryClient }]],
        stubs: {
          ImportDialog: ImportDialogStub,
          UserDeleteDialog: true,
          UserFormDialog: true,
          UserTable: UserTableStub,
          UserToolbar: true,
        },
      },
    })
    await flushPromises()

    expect(wrapper.get('[data-open-import]').attributes('disabled')).toBeUndefined()
    await wrapper.get('[data-open-import]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-import-dialog]').exists()).toBe(true))
    expect(policyRequestCount).toBe(2)

    wrapper.unmount()
    queryClient.clear()
  })

  it('keeps failed rows selected and reports a partially successful batch', async () => {
    server.use(
      http.delete('/api/users/:userId', ({ params }) =>
        params.userId === '5'
          ? HttpResponse.json(
              { code: 'DELETE_FAILED', message: 'Delete failed', data: null },
              { status: 500 },
            )
          : HttpResponse.json({ code: 0, message: 'deleted', data: null })),
    )

    const UserTableStub = defineComponent({
      name: 'UserTable',
      props: {
        selectedRowIds: { type: Object, required: true },
      },
      emits: ['update:selectedRowIds', 'bulkDelete'],
      template: `
        <button data-select-users @click="$emit('update:selectedRowIds', { '4': true, '5': true })">
          Select users
        </button>
        <button data-delete-users @click="$emit('bulkDelete')">Delete users</button>
      `,
    })
    const UserDeleteDialogStub = defineComponent({
      name: 'UserDeleteDialog',
      props: { open: { type: Boolean, required: true } },
      emits: ['update:open', 'confirm'],
      template:
        '<button v-if="open" data-confirm-delete @click="$emit(\'confirm\')">Confirm</button>',
    })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/users', component: { template: '<div />' } }],
    })
    await router.push('/users')
    await router.isReady()
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const wrapper = mount(UsersPage, {
      global: {
        plugins: [createPinia(), router, i18n, [VueQueryPlugin, { queryClient }]],
        stubs: {
          ImportDialog: true,
          UserDeleteDialog: UserDeleteDialogStub,
          UserFormDialog: true,
          UserTable: UserTableStub,
          UserToolbar: true,
        },
      },
    })
    await flushPromises()

    await wrapper.get('[data-select-users]').trigger('click')
    await nextTick()
    await wrapper.get('[data-delete-users]').trigger('click')
    await nextTick()
    await wrapper.get('[data-confirm-delete]').trigger('click')

    await vi.waitFor(() => expect(toast.warning).toHaveBeenCalledOnce())
    expect(toast.warning).toHaveBeenCalledWith('Deleted: 1; failed: 1', {
      description: 'Still selected user IDs: 5.',
    })
    expect(wrapper.findComponent(UserTableStub).props('selectedRowIds')).toEqual({ 5: true })

    wrapper.unmount()
    queryClient.clear()
  })

  it('updates shell identity state after an administrator edits their own profile row', async () => {
    const UserTableStub = defineComponent({
      name: 'UserTable',
      props: {
        users: { type: Array, required: true },
      },
      emits: ['edit'],
      setup(_props, { emit }) {
        const editSelf = () => emit('edit', adminUser)
        return { editSelf }
      },
      template: '<button data-edit-self @click="editSelf">Edit self</button>',
    })
    const UserFormDialogStub = defineComponent({
      name: 'UserFormDialog',
      props: {
        open: { type: Boolean, required: true },
        user: { type: Object, default: undefined },
      },
      emits: ['save'],
      template: `
        <button
          v-if="open && user"
          data-save-self
          @click="$emit('save', {
            name: 'Updated shell administrator',
            email: user.email,
            role: user.role,
            status: user.status,
          })"
        >
          Save self
        </button>
      `,
    })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/users', component: { template: '<div />' } }],
    })
    await router.push('/users')
    await router.isReady()
    const pinia = createPinia()
    const auth = useAuthStore(pinia)
    auth.setUser(adminUser)
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const wrapper = mount(UsersPage, {
      global: {
        plugins: [pinia, router, i18n, [VueQueryPlugin, { queryClient }]],
        stubs: {
          ImportDialog: true,
          UserDeleteDialog: true,
          UserFormDialog: UserFormDialogStub,
          UserTable: UserTableStub,
          UserToolbar: true,
        },
      },
    })
    await flushPromises()

    await wrapper.get('[data-edit-self]').trigger('click')
    await nextTick()
    await wrapper.get('[data-save-self]').trigger('click')
    await vi.waitFor(() => expect(auth.user?.name).toBe('Updated shell administrator'))

    wrapper.unmount()
    queryClient.clear()
  })
})
