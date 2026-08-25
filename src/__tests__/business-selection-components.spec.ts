import type { DepartmentRecord } from '@/features/departments/types'
import type { UserListResponse } from '@/features/users/types'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import {
  CodeEditor,
  DepartmentTree,
  getCropSourceRectangle,
  getQrCodeDownloadName,
  IconSelector,
  inspectJson,
  isAdminIconKey,
  JSONViewer,
  MarkdownEditor,
  RoleSelector,
  UserSelector,
} from '@/components/admin'
import { i18n, setLocale } from '@/i18n'
import { generateMockToken } from '@/mocks/data/users'

enableAutoUnmount(afterEach)

beforeEach(() => {
  setLocale('en-US')
  document.body.innerHTML = ''
  localStorage.removeItem('auth_token')
  sessionStorage.setItem('auth_token', generateMockToken(1))
})

afterEach(() => {
  localStorage.removeItem('auth_token')
  sessionStorage.removeItem('auth_token')
})

describe('business identity selectors', () => {
  it('searches the backend and emits only the selected numeric user ID', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = mount(UserSelector, {
      attachTo: document.body,
      global: { plugins: [i18n, [VueQueryPlugin, { queryClient }]] },
    })
    await flushPromises()

    await wrapper.get('button[aria-expanded]').trigger('click')
    await nextTick()
    const searchInput = document.body.querySelector<HTMLInputElement>('[role="combobox"]')
    expect(searchInput).not.toBeNull()
    searchInput!.value = 'editor'
    searchInput!.dispatchEvent(new Event('input', { bubbles: true }))
    await vi.waitFor(() => {
      const remoteUsers = queryClient.getQueryData<UserListResponse>([
        'user-selector',
        'editor',
        20,
        'all',
      ])
      expect(remoteUsers?.items[0]?.email).toContain('editor')
    })

    await vi.waitFor(() => {
      expect(document.body.querySelectorAll('[role="option"]')).not.toHaveLength(0)
    })
    const firstAccessibleUser = document.body.querySelector<HTMLButtonElement>('[role="option"]')
    expect(firstAccessibleUser).not.toBeNull()
    firstAccessibleUser?.click()
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(expect.any(Number))
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('returns stable role and allow-listed icon keys', async () => {
    const roleWrapper = mount(RoleSelector, {
      attachTo: document.body,
      global: { plugins: [i18n] },
    })
    await roleWrapper.get('button[aria-expanded]').trigger('click')
    await nextTick()
    const editorOption = [
      ...document.body.querySelectorAll<HTMLButtonElement>('[role="option"]'),
    ].find(option => option.textContent?.includes('Content Editor'))
    editorOption?.click()
    await nextTick()
    expect(roleWrapper.emitted('update:modelValue')?.[0]).toEqual(['editor'])
    roleWrapper.unmount()
    document.body.innerHTML = ''

    const iconWrapper = mount(IconSelector, {
      attachTo: document.body,
      global: { plugins: [i18n] },
    })
    await iconWrapper.get('[role="combobox"]').trigger('click')
    await nextTick()
    const usersIcon = document.body.querySelector<HTMLButtonElement>(
      '[role="option"][aria-label="Users"]',
    )
    expect(usersIcon).not.toBeNull()
    usersIcon?.click()
    await nextTick()

    expect(iconWrapper.emitted('update:modelValue')?.[0]).toEqual(['users'])
    expect(isAdminIconKey('users')).toBe(true)
    expect(isAdminIconKey('script-injection')).toBe(false)
  })
})

describe('departmentTree', () => {
  const departments: readonly DepartmentRecord[] = [
    { id: 'company', name: 'Company', parentId: null, order: 1, status: 'active' },
    { id: 'product', name: 'Product', parentId: 'company', order: 1, status: 'active' },
    { id: 'disabled', name: 'Disabled', parentId: 'company', order: 2, status: 'disabled' },
  ]

  it('preserves hierarchy and prevents disabled departments from being selected', async () => {
    const wrapper = mount(DepartmentTree, {
      props: { departments },
      global: { plugins: [i18n] },
    })
    await nextTick()

    expect(wrapper.findAll('[role="treeitem"]')).toHaveLength(3)
    await wrapper.get('[data-tree-node-id="disabled"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await wrapper.get('[data-tree-node-id="product"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['product'])
    expect(wrapper.get('[data-tree-node-id="product"]').attributes('aria-level')).toBe('2')
  })
})

describe('safe text editors and viewers', () => {
  it('keeps Markdown preview text escaped and controlled', async () => {
    const markdown = '<img src=x onerror="alert(1)">\n# Heading'
    const wrapper = mount(MarkdownEditor, {
      props: { modelValue: markdown },
      global: { plugins: [i18n] },
    })

    expect(wrapper.find('[data-testid="markdown-preview"] img').exists()).toBe(false)
    expect(wrapper.get('[data-testid="markdown-preview"]').text()).toContain('<img src=x')
    await wrapper.get('textarea').setValue('Updated source')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Updated source'])
  })

  it('validates unknown JSON values and toggles a compact representation', async () => {
    expect(inspectJson({ enabled: true }).isValid).toBe(true)
    expect(inspectJson('{invalid').isValid).toBe(false)

    const wrapper = mount(JSONViewer, {
      props: { value: { name: 'Admin', roles: ['admin'] } },
      global: { plugins: [i18n] },
    })
    expect(wrapper.get('[data-testid="json-content"]').text()).toContain('\n')
    await wrapper.get('[aria-label="Collapse JSON"]').trigger('click')
    expect(wrapper.emitted('update:collapsed')?.[0]).toEqual([true])
    expect(wrapper.get('[data-testid="json-content"]').text()).toBe(
      '{"name":"Admin","roles":["admin"]}',
    )

    const invalidWrapper = mount(JSONViewer, {
      props: { value: '{invalid' },
      global: { plugins: [i18n] },
    })
    expect(invalidWrapper.get('[role="alert"]').text()).toBe('This value is not valid JSON.')
  })

  it('uses a controlled textarea with language, read-only, and line-number semantics', async () => {
    const wrapper = mount(CodeEditor, {
      props: {
        modelValue: 'const first = 1\nconst second = 2',
        language: 'typescript',
      },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toContain('typescript')
    expect(wrapper.findAll('ol li')).toHaveLength(2)
    await wrapper.get('textarea').setValue('const final = true')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['const final = true'])

    const readOnlyWrapper = mount(CodeEditor, {
      props: { modelValue: 'locked', readOnly: true },
      global: { plugins: [i18n] },
    })
    expect(readOnlyWrapper.get('textarea').attributes()).toHaveProperty('readonly')
  })
})

describe('business media components', () => {
  it('calculates a bounded crop rectangle from aspect, zoom, and position', () => {
    expect(getCropSourceRectangle(900, 600, 1, 1, 0, 0)).toEqual({
      x: 150,
      y: 0,
      width: 600,
      height: 600,
    })
    expect(getCropSourceRectangle(900, 600, 1, 2, 1, -1)).toEqual({
      x: 450,
      y: 0,
      width: 300,
      height: 300,
    })
    expect(() => getCropSourceRectangle(0, 600, 1, 1, 0, 0)).toThrow(RangeError)
  })

  it('sanitizes the QR download name without retaining path segments', () => {
    expect(getQrCodeDownloadName('../../quarterly access')).toBe('quarterly-access.png')
    expect(getQrCodeDownloadName('share.PNG')).toBe('share.PNG')
    expect(getQrCodeDownloadName('...')).toBe('qr-code.png')
  })
})
