import type { AdminIconKey } from '@/components/admin/icon-selector'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import CopyButton from '@/components/admin/CopyButton.vue'
import {
  ADMIN_ICON_CATEGORIES,
  ADMIN_ICON_OPTIONS,
  getAdminIconComponent,
  getAdminIconOption,
  isAdminIconKey,
  UNKNOWN_ADMIN_ICON_COMPONENT,
} from '@/components/admin/icon-selector'
import IconSelector from '@/components/admin/IconSelector.vue'
import { componentCenterModules } from '@/features/component-gallery/component-center-modules'
import IconCatalogExplorer from '@/features/component-gallery/icons/components/IconCatalogExplorer.vue'
import IconExamplesPage from '@/features/component-gallery/icons/IconExamplesPage.vue'
import { MANAGED_MENU_ICON_KEYS } from '@/features/menus/types'
import { i18n, setLocale } from '@/i18n'
import { getAdminNavigationIcon } from '@/router/admin-navigation'

enableAutoUnmount(afterEach)

const clipboardWrite = vi.fn<(value: string) => Promise<void>>()
const clipboardCommand = vi.fn<(commandId: string) => boolean>()

beforeEach(() => {
  setLocale('en-US')
  clipboardWrite.mockReset()
  clipboardWrite.mockResolvedValue(undefined)
  clipboardCommand.mockReset()
  clipboardCommand.mockReturnValue(true)
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: clipboardCommand,
  })
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: clipboardWrite },
  })
})

describe('audited admin icon registry', () => {
  it('keeps a broad categorized inventory and exact managed-menu allowlist parity', () => {
    expect(ADMIN_ICON_OPTIONS.length).toBeGreaterThanOrEqual(70)
    expect(new Set(ADMIN_ICON_OPTIONS.map(option => option.key)).size).toBe(
      ADMIN_ICON_OPTIONS.length,
    )
    expect(new Set(ADMIN_ICON_OPTIONS.map(option => option.category))).toEqual(
      new Set(ADMIN_ICON_CATEGORIES),
    )

    const menuSafeKeys = ADMIN_ICON_OPTIONS.filter(option => option.isMenuSafe)
      .map(option => option.key)
      .sort()
    expect(menuSafeKeys).toEqual([...MANAGED_MENU_ICON_KEYS].sort())

    for (const iconKey of MANAGED_MENU_ICON_KEYS) {
      expect(getAdminNavigationIcon(iconKey)).toBe(getAdminIconComponent(iconKey))
      expect(getAdminIconOption(iconKey)?.isMenuSafe).toBe(true)
    }
  })

  it('rejects arbitrary keys and returns one explicit local fallback component', () => {
    expect(isAdminIconKey('dashboard')).toBe(true)
    expect(isAdminIconKey('backend-widget-script')).toBe(false)
    expect(getAdminIconOption('backend-widget-script')).toBeUndefined()
    expect(getAdminIconComponent('backend-widget-script')).toBe(UNKNOWN_ADMIN_ICON_COMPONENT)
    expect(getAdminIconComponent(undefined)).toBe(UNKNOWN_ADMIN_ICON_COMPONENT)
  })
})

describe('icon catalog interactions', () => {
  it('searches exact Lucide names, filters categories, and recovers from no results', async () => {
    const wrapper = mount(IconCatalogExplorer, {
      global: { plugins: [i18n] },
    })

    expect(wrapper.findAll('[data-icon-key]')).toHaveLength(ADMIN_ICON_OPTIONS.length)
    await wrapper.get('input[type="search"]').setValue('ChartLine')
    expect(
      wrapper.findAll('[data-icon-key]').map(icon => icon.attributes('data-icon-key')),
    ).toEqual(['chart-line'])

    await wrapper.get('input[type="search"]').setValue('')
    const commerceFilter = wrapper.findAll('button').find(button => button.text() === 'Commerce')
    expect(commerceFilter).toBeDefined()
    await commerceFilter!.trigger('click')
    expect(wrapper.findAll('[data-icon-key]')).not.toHaveLength(0)
    expect(
      wrapper
        .findAll('[data-icon-key]')
        .every(
          icon => getAdminIconOption(icon.attributes('data-icon-key'))?.category === 'commerce',
        ),
    ).toBe(true)

    await wrapper.get('input[type="search"]').setValue('no-such-backend-component')
    expect(wrapper.text()).toContain('No icons match these filters')
    await wrapper
      .findAll('button')
      .find(button => button.text() === 'Clear icon filters')!
      .trigger('click')
    expect(wrapper.findAll('[data-icon-key]')).toHaveLength(ADMIN_ICON_OPTIONS.length)
  })

  it('copies the static Lucide import name and exposes visible completion feedback', async () => {
    const wrapper = mount(IconCatalogExplorer, {
      global: { plugins: [i18n] },
    })
    await wrapper.get('input[type="search"]').setValue('LayoutDashboard')
    expect(wrapper.getComponent(CopyButton).props('value')).toBe('LayoutDashboard')
    const copyButton = wrapper.get('[data-icon-key="dashboard"] button')
    await copyButton.trigger('click')
    await flushPromises()

    expect(clipboardWrite.mock.calls.length + clipboardCommand.mock.calls.length).toBe(1)
    expect(copyButton.text()).toContain('Copied')
  })

  it('lets IconSelector search the same registry and emits only the chosen stable key', async () => {
    const wrapper = mount(IconSelector, {
      attachTo: document.body,
      global: { plugins: [i18n] },
    })
    await wrapper.get('[role="combobox"]').trigger('click')
    await nextTick()

    const searchInput = document.body.querySelector<HTMLInputElement>(
      '[aria-label="Search icon name or key"]',
    )
    expect(searchInput).not.toBeNull()
    searchInput!.value = 'ChartLine'
    searchInput!.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()

    const options = document.body.querySelectorAll<HTMLButtonElement>('[data-icon-option-key]')
    expect([...options].map(option => option.dataset.iconOptionKey)).toEqual(['chart-line'])
    options[0]?.click()
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['chart-line' satisfies AdminIconKey])
  })
})

describe('dedicated icon route content', () => {
  it('documents responsive usage, fallback, custom SVG, and both supported locales', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/components', component: { template: '<div />' } },
        ...componentCenterModules.map(componentModule => ({
          path: componentModule.path,
          component: { template: '<div />' },
        })),
      ],
    })
    await router.push('/components/icons')
    await router.isReady()

    const wrapper = mount(IconExamplesPage, {
      global: { plugins: [router, i18n] },
    })
    expect(wrapper.text()).toContain('Lucide inventory')
    expect(wrapper.text()).toContain('Safe menu registry and fallbacks')
    expect(wrapper.text()).toContain('Custom SVG integration')
    expect(wrapper.text()).toContain('Never: resolveComponent(serverIconKey)')
    expect(wrapper.get('svg[role="img"] title').text()).toBe('Custom operations mark')

    setLocale('zh-CN')
    await nextTick()
    expect(wrapper.text()).toContain('Lucide 图标总览')
    expect(wrapper.text()).toContain('安全菜单注册表与 fallback')
    expect(wrapper.text()).toContain('自定义 SVG 接入')
  })
})
