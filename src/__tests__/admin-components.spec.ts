import type { User } from '@/stores/auth'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, shallowRef } from 'vue'
import Callout from '@/components/admin/Callout.vue'
import DetailDrawer from '@/components/admin/DetailDrawer.vue'
import EmptyState from '@/components/admin/EmptyState.vue'
import FormDialog from '@/components/admin/FormDialog.vue'
import NumberField from '@/components/admin/NumberField.vue'
import PageHeader from '@/components/admin/PageHeader.vue'
import PasswordField from '@/components/admin/PasswordField.vue'
import PermissionGate from '@/components/admin/PermissionGate.vue'
import ProgressBar from '@/components/admin/ProgressBar.vue'
import SearchableSelect from '@/components/admin/SearchableSelect.vue'
import TagInput from '@/components/admin/TagInput.vue'
import TreeView from '@/components/admin/TreeView.vue'
import UserFormDialog from '@/features/users/components/UserFormDialog.vue'
import { i18n } from '@/i18n'
import { updateAbility } from '@/lib/ability'
import { getTestAuthorization } from './auth-test-helpers'

const adminUser: User = {
  id: 1,
  name: 'Admin',
  email: 'admin@example.com',
  role: 'admin',
  status: 'active',
  createdAt: '2026-01-01T08:00:00.000Z',
}

afterEach(() => {
  updateAbility(null)
  document.body.innerHTML = ''
})

describe('searchableSelect', () => {
  it('filters options and updates the controlled value after a selection', async () => {
    const wrapper = mount(SearchableSelect, {
      attachTo: document.body,
      props: {
        options: [
          { value: 'growth', label: 'Growth team', keywords: ['marketing'] },
          { value: 'platform', label: 'Platform team', keywords: ['engineering'] },
        ],
      },
      global: { plugins: [i18n] },
    })

    expect(wrapper.find('[role="combobox"]').exists()).toBe(false)
    await wrapper.get('button[aria-expanded]').trigger('click')
    await nextTick()

    const searchInput = document.body.querySelector<HTMLInputElement>('[role="combobox"]')
    expect(searchInput).not.toBeNull()
    expect(document.body.querySelectorAll('[role="combobox"]')).toHaveLength(1)
    expect(searchInput?.getAttribute('aria-autocomplete')).toBe('list')
    expect(searchInput?.getAttribute('aria-expanded')).toBe('true')
    const listboxId = searchInput?.getAttribute('aria-controls')
    expect(listboxId).toBeTruthy()
    expect(document.getElementById(listboxId!)?.getAttribute('role')).toBe('listbox')

    const platformOption = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find(
      option => option.textContent?.includes('Platform team'),
    )
    const platformOptionId = platformOption?.id
    expect(platformOptionId).toBeTruthy()

    searchInput!.value = 'engineering'
    searchInput!.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()

    const options = document.body.querySelectorAll('[role="option"]')
    expect(options).toHaveLength(1)
    expect(options[0]?.id).toBe(platformOptionId)
    expect(searchInput?.getAttribute('aria-activedescendant')).toBe(platformOptionId)
    await (options[0] as HTMLButtonElement).click()
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['platform'])
    wrapper.unmount()
  })

  it('synchronizes keyboard navigation, visual highlight, and the active descendant', async () => {
    const wrapper = mount(SearchableSelect, {
      attachTo: document.body,
      props: {
        options: [
          { value: 'disabled-first', label: 'Disabled first', disabled: true },
          { value: 'growth', label: 'Growth team' },
          { value: 'disabled-middle', label: 'Disabled middle', disabled: true },
          { value: 'platform', label: 'Platform team' },
        ],
      },
      global: { plugins: [i18n] },
    })

    await wrapper.get('button[aria-expanded]').trigger('click')
    await nextTick()
    const searchInput = document.body.querySelector<HTMLInputElement>('[role="combobox"]')!

    function expectActiveOption(label: string): void {
      const activeOptionId = searchInput.getAttribute('aria-activedescendant')
      expect(activeOptionId).toBeTruthy()
      const activeOption = document.getElementById(activeOptionId!)
      expect(activeOption?.textContent).toContain(label)
      expect(activeOption?.classList.contains('bg-accent')).toBe(true)
    }

    expectActiveOption('Growth team')
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await nextTick()
    expectActiveOption('Platform team')

    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    await nextTick()
    expectActiveOption('Growth team')

    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    await nextTick()
    expectActiveOption('Platform team')

    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    await nextTick()
    expectActiveOption('Growth team')

    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['growth'])
    expect(searchInput.getAttribute('aria-expanded')).toBe('false')
    expect(searchInput.hasAttribute('aria-activedescendant')).toBe(false)
    wrapper.unmount()
  })

  it('closes on Escape without selecting an active option', async () => {
    const wrapper = mount(SearchableSelect, {
      attachTo: document.body,
      props: {
        options: [
          { value: 'growth', label: 'Growth team' },
          { value: 'platform', label: 'Platform team' },
        ],
      },
      global: { plugins: [i18n] },
    })

    const trigger = wrapper.get('button[aria-expanded]')
    await trigger.trigger('click')
    await nextTick()
    const searchInput = document.body.querySelector<HTMLInputElement>('[role="combobox"]')!
    searchInput.value = 'platform'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(searchInput.getAttribute('aria-expanded')).toBe('false')
    expect(searchInput.hasAttribute('aria-activedescendant')).toBe(false)

    await trigger.trigger('click')
    await nextTick()
    expect(document.body.querySelector<HTMLInputElement>('[role="combobox"]')?.value).toBe('')
    wrapper.unmount()
  })

  it('does not expose or select an active descendant when every option is disabled', async () => {
    const wrapper = mount(SearchableSelect, {
      attachTo: document.body,
      props: {
        options: [
          { value: 'growth', label: 'Growth team', disabled: true },
          { value: 'platform', label: 'Platform team', disabled: true },
        ],
      },
      global: { plugins: [i18n] },
    })

    await wrapper.get('button[aria-expanded]').trigger('click')
    await nextTick()
    const searchInput = document.body.querySelector<HTMLInputElement>('[role="combobox"]')!

    for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter']) {
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
      await nextTick()
      expect(searchInput.hasAttribute('aria-activedescendant')).toBe(false)
    }
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })
})

describe('permissionGate', () => {
  it('updates the rendered boundary when the CASL policy changes', async () => {
    updateAbility(null)
    const wrapper = mount(PermissionGate, {
      props: {
        action: 'update',
        subject: 'Settings',
      },
      slots: {
        default: 'Allowed',
        fallback: 'Denied',
      },
    })

    expect(wrapper.text()).toContain('Denied')
    updateAbility(adminUser, getTestAuthorization(adminUser))
    await nextTick()

    expect(wrapper.text()).toContain('Allowed')
  })
})

describe('admin workflow containers', () => {
  it('keeps long page titles shrinkable and lets action groups wrap', () => {
    const wrapper = mount(PageHeader, {
      props: {
        title: 'Exceptionally long translated administration workspace title',
        description:
          'A long supporting description that remains readable without forcing the shell wider.',
      },
      slots: { actions: '<button type="button">Primary operation</button>' },
    })

    expect(wrapper.get('header').classes()).toContain('min-w-0')
    expect(wrapper.get('h1').classes()).toContain('break-words')
    expect(wrapper.get('header .flex-wrap').classes()).toContain('flex-wrap')
  })

  it('emits a form submit event from the reusable dialog', async () => {
    const wrapper = mount(FormDialog, {
      attachTo: document.body,
      props: {
        open: true,
        title: 'Create project',
      },
      slots: {
        default: '<input name="project-name">',
      },
      global: { plugins: [i18n] },
    })
    await nextTick()

    const submitButton = document.body.querySelector<HTMLButtonElement>(
      '[data-slot="dialog-content"] button[type="submit"]',
    )
    expect(submitButton).not.toBeNull()
    await submitButton!.click()

    expect(wrapper.emitted('submit')).toHaveLength(1)
    wrapper.unmount()
  })

  it('focuses the first invalid control after a shared dialog submission', async () => {
    const InvalidFormHost = defineComponent({
      components: { FormDialog },
      setup() {
        const isOpen = shallowRef(true)
        const hasSubmitted = shallowRef(false)
        return { hasSubmitted, isOpen }
      },
      template: `
        <FormDialog v-model:open="isOpen" title="Create project" @submit="hasSubmitted = true">
          <input name="project-name" :aria-invalid="hasSubmitted" />
          <input name="project-owner" :aria-invalid="hasSubmitted" />
        </FormDialog>
      `,
    })
    const wrapper = mount(InvalidFormHost, {
      attachTo: document.body,
      global: { plugins: [i18n] },
    })
    await nextTick()

    const submitButton = document.body.querySelector<HTMLButtonElement>(
      '[data-slot="dialog-content"] button[type="submit"]',
    )
    submitButton?.click()
    await flushPromises()
    await new Promise(resolve => window.setTimeout(resolve, 0))

    expect(document.activeElement).toBe(document.body.querySelector('input[name="project-name"]'))
    wrapper.unmount()
  })

  it('applies the invalid-focus contract to a schema-driven business form', async () => {
    const wrapper = mount(UserFormDialog, {
      attachTo: document.body,
      props: {
        open: true,
        isSaving: false,
        canAssignRoles: true,
      },
      global: { plugins: [i18n] },
    })
    await nextTick()

    const submitButton = document.body.querySelector<HTMLButtonElement>(
      '[data-slot="dialog-content"] button[type="submit"]',
    )
    submitButton?.click()
    const nameInput = document.body.querySelector<HTMLInputElement>('input[name="name"]')
    await vi.waitFor(() => expect(nameInput?.getAttribute('aria-invalid')).toBe('true'))
    expect(document.activeElement).toBe(nameInput)
    expect(wrapper.emitted('save')).toBeUndefined()
    wrapper.unmount()
  })

  it('renders detail content in the reusable drawer', async () => {
    const wrapper = mount(DetailDrawer, {
      attachTo: document.body,
      props: {
        open: true,
        title: 'Project details',
      },
      slots: {
        default: 'Project detail content',
      },
      global: { plugins: [i18n] },
    })
    await nextTick()

    const drawer = document.body.querySelector('[data-slot="sheet-content"]')
    expect(drawer?.textContent).toContain('Project details')
    expect(drawer?.textContent).toContain('Project detail content')
    wrapper.unmount()
  })
})

describe('advanced form controls', () => {
  it('adds controlled tags and rejects duplicates', async () => {
    const wrapper = mount(TagInput, {
      props: { modelValue: ['growth'] },
    })

    const input = wrapper.get('input')
    await input.setValue('priority')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['growth', 'priority']])

    await input.setValue('GROWTH')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('rejected')?.[0]?.[0]).toEqual([
      { value: 'GROWTH', reason: 'duplicate' },
    ])
  })

  it('emits bounded number changes from increment controls', async () => {
    const wrapper = mount(NumberField, {
      props: {
        modelValue: 2,
        min: 1,
        max: 3,
        incrementLabel: 'Increase seats',
      },
    })

    // AI modified: the business wrapper now delegates input and boundary behavior to the shadcn number field.
    expect(wrapper.get('[data-slot="input"].border-input').element.tagName).toBe('INPUT')
    const incrementButton = wrapper.get('[aria-label="Increase seats"]')
    await nextTick()
    incrementButton.element.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, button: 0 }),
    )
    window.dispatchEvent(new MouseEvent('pointerup', { button: 0 }))
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([3])

    await wrapper.setProps({ modelValue: 3 })
    expect(incrementButton.attributes('disabled')).toBeDefined()
  })

  it('toggles password visibility without changing its controlled value', async () => {
    const wrapper = mount(PasswordField, {
      props: {
        modelValue: 'secret',
        showLabel: 'Show secret',
        hideLabel: 'Hide secret',
      },
      attrs: {
        'aria-invalid': 'true',
        'aria-describedby': 'password-error',
      },
    })

    const input = wrapper.get('[data-slot="input-group-control"]')
    expect(input.attributes()).toMatchObject({
      'aria-invalid': 'true',
      'aria-describedby': 'password-error',
    })
    expect(input.attributes('type')).toBe('password')
    const visibilityButton = wrapper.get('[aria-label="Show secret"]')
    expect(visibilityButton.attributes('title')).toBe('Show secret')
    await visibilityButton.trigger('click')
    expect(input.attributes('type')).toBe('text')
    expect(visibilityButton.attributes('aria-label')).toBe('Hide secret')
    expect(visibilityButton.attributes('title')).toBe('Hide secret')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('feedback components', () => {
  it('emits a controlled visibility update when a callout is dismissed', async () => {
    const wrapper = mount(Callout, {
      props: {
        visible: true,
        title: 'Review required',
        description: 'Confirm the latest policy.',
        dismissible: true,
        closeLabel: 'Dismiss review',
      },
    })

    expect(wrapper.get('[data-slot="alert"]').attributes('role')).toBe('status')
    expect(wrapper.get('[data-slot="alert-title"]').text()).toBe('Review required')
    expect(wrapper.get('[data-slot="alert-description"]').text()).toContain(
      'Confirm the latest policy.',
    )

    const dismissButton = wrapper.get('[aria-label="Dismiss review"]')
    expect(dismissButton.get('svg').attributes('data-icon')).toBe('inline-start')
    await dismissButton.trigger('click')
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([false])
  })

  it('preserves callout content slots through the shared alert composition', () => {
    const wrapper = mount(Callout, {
      props: {
        title: 'Permission warning',
        tone: 'warning',
      },
      slots: {
        default: '<p>Only administrators can continue.</p>',
        actions: '<button type="button">Review access</button>',
      },
    })

    expect(wrapper.get('[data-slot="alert"]').attributes('role')).toBe('alert')
    expect(wrapper.text()).toContain('Only administrators can continue.')
    expect(wrapper.get('button').text()).toBe('Review access')
  })

  it('renders empty-state content and actions with the shared empty composition', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No matching records',
        description: 'Clear the active filters and try again.',
      },
      slots: {
        actions: '<button type="button">Clear filters</button>',
      },
    })

    expect(wrapper.find('[data-slot="empty"]').exists()).toBe(true)
    expect(wrapper.get('[data-slot="empty-icon"] svg').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('h2').text()).toBe('No matching records')
    expect(wrapper.get('[data-slot="empty-description"]').text()).toBe(
      'Clear the active filters and try again.',
    )
    expect(wrapper.get('[data-slot="empty-content"] button').text()).toBe('Clear filters')

    const customIconWrapper = mount(EmptyState, {
      props: { title: 'Archived records' },
      slots: { icon: '<span data-testid="archive-icon">Archive</span>' },
    })
    expect(customIconWrapper.get('[data-testid="archive-icon"]').text()).toBe('Archive')
  })

  it('bounds progress semantics and visible width to the configured maximum', () => {
    const wrapper = mount(ProgressBar, {
      props: {
        value: 150,
        max: 100,
        label: 'Import progress',
      },
    })

    const progressbar = wrapper.get('[role="progressbar"]')
    expect(progressbar.attributes('aria-valuenow')).toBe('100')
    expect(progressbar.find('div').attributes('style')).toContain('width: 100%')
  })
})

describe('treeView', () => {
  const nodes = [
    {
      id: 'workspace',
      label: 'Workspace',
      children: [
        { id: 'analytics', label: 'Analytics' },
        { id: 'users', label: 'Users' },
      ],
    },
  ]

  it('emits leaf selections when checking a parent node', async () => {
    const wrapper = mount(TreeView, {
      props: {
        nodes,
        expandedIds: ['workspace'],
        checkedIds: [],
        checkable: true,
        checkLabel: 'Toggle permission',
      },
      global: { plugins: [i18n] },
    })

    expect(wrapper.findAll('[role="treeitem"]')).toHaveLength(3)
    await wrapper.get('[aria-label="Toggle permission: Workspace"]').trigger('click')

    expect(wrapper.emitted('update:checkedIds')?.[0]).toEqual([['analytics', 'users']])
  })

  it('emits selection and collapse changes through controlled models', async () => {
    const wrapper = mount(TreeView, {
      props: {
        nodes,
        expandedIds: ['workspace'],
        selectedId: null,
        collapseLabel: 'Collapse node',
      },
      global: { plugins: [i18n] },
    })

    await wrapper.get('[data-tree-node-id="analytics"]').trigger('click')
    expect(wrapper.emitted('update:selectedId')?.[0]).toEqual(['analytics'])

    await wrapper.get('[aria-label="Collapse node: Workspace"]').trigger('click')
    expect(wrapper.emitted('update:expandedIds')?.[0]).toEqual([[]])
  })

  it('loads an expandable branch on demand and exposes its busy state', async () => {
    let releaseChildren: ((children: readonly { id: string, label: string }[]) => void) | undefined
    const wrapper = mount(TreeView, {
      props: {
        nodes: [{ id: 'archive', label: 'Archive', hasChildren: true }],
        expandedIds: [],
        loadingLabel: 'Loading branch',
        loadChildren: () =>
          new Promise((resolve) => {
            releaseChildren = resolve
          }),
      },
      global: { plugins: [i18n] },
    })

    await wrapper.get('[aria-label="Expand: Archive"]').trigger('click')
    expect(wrapper.get('[data-tree-node-id="archive"]').attributes('aria-busy')).toBe('true')
    expect(
      wrapper.get('[aria-label="Loading branch: Archive"]').attributes('disabled'),
    ).toBeDefined()

    releaseChildren?.([{ id: 'retention', label: 'Retention records' }])
    await flushPromises()

    expect(wrapper.find('[data-tree-node-id="retention"]').exists()).toBe(true)
    expect(wrapper.emitted('load')?.[0]?.[0]).toMatchObject({ id: 'archive' })
    const expandedUpdates = wrapper.emitted('update:expandedIds') ?? []
    expect(expandedUpdates[expandedUpdates.length - 1]).toEqual([['archive']])
  })

  it('offers a named retry after a lazy branch fails', async () => {
    let loadAttempts = 0
    const wrapper = mount(TreeView, {
      props: {
        nodes: [{ id: 'archive', label: 'Archive', hasChildren: true }],
        expandedIds: [],
        retryLoadLabel: 'Retry branch',
        loadChildren: async () => {
          loadAttempts += 1
          if (loadAttempts === 1)
            throw new Error('Archive unavailable')
          return [{ id: 'retention', label: 'Retention records' }]
        },
      },
      global: { plugins: [i18n] },
    })

    await wrapper.get('[aria-label="Expand: Archive"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[aria-label="Retry branch: Archive"]').exists()).toBe(true)
    expect(wrapper.emitted('loadError')).toHaveLength(1)

    await wrapper.get('[aria-label="Retry branch: Archive"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-tree-node-id="retention"]').exists()).toBe(true)
    expect(loadAttempts).toBe(2)
  })

  it('ignores a lazy branch result after the caller replaces the tree', async () => {
    let releaseChildren: ((children: readonly { id: string, label: string }[]) => void) | undefined
    const wrapper = mount(TreeView, {
      props: {
        nodes: [{ id: 'archive', label: 'Archive', hasChildren: true }],
        expandedIds: [],
        loadChildren: () =>
          new Promise((resolve) => {
            releaseChildren = resolve
          }),
      },
      global: { plugins: [i18n] },
    })

    await wrapper.get('[aria-label="Expand: Archive"]').trigger('click')
    await wrapper.setProps({
      nodes: [{ id: 'archive', label: 'Replacement archive', hasChildren: true }],
    })
    releaseChildren?.([{ id: 'stale-child', label: 'Stale child' }])
    await flushPromises()

    // AI modified: a completed request belongs only to the node revision that started it.
    expect(wrapper.find('[data-tree-node-id="stale-child"]').exists()).toBe(false)
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(false)
    expect(wrapper.emitted('load')).toBeUndefined()
  })
})
