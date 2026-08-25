import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AdminContextBar from '@/components/layout/AdminContextBar.vue'
import {
  ADMIN_DESKTOP_BREAKPOINT_PX,
  ADMIN_SHELL_METRICS,
  getAdminLayoutDefinition,
  getAdminNavigationWidths,
} from '@/components/layout/layout-contract'
import { i18n } from '@/i18n'
import { LAYOUT_MODES } from '@/stores/appearance'
import { getActiveTabIdAfterClose } from '@/stores/tab-navigation'

describe('configurable admin layout contract', () => {
  it('gives all six persisted modes a distinct grid arrangement', () => {
    const definitions = LAYOUT_MODES.map(layoutMode => getAdminLayoutDefinition(layoutMode))

    expect(definitions.map(definition => definition.mode)).toEqual(LAYOUT_MODES)
    expect(new Set(definitions.map(definition => definition.gridTemplateAreas)).size).toBe(6)
    expect(definitions.every(definition => definition.gridTemplateColumns.length > 0)).toBe(true)
    expect(definitions.every(definition => definition.gridTemplateRows.length > 0)).toBe(true)
    expect(
      definitions.every(definition => definition.previewGridTemplateColumns.length > 0),
    ).toBe(true)
    expect(definitions.every(definition => definition.previewGridTemplateRows.length > 0)).toBe(
      true,
    )
    expect(
      definitions.every(
        definition => definition.desktopBreakpoint === ADMIN_DESKTOP_BREAKPOINT_PX,
      ),
    ).toBe(true)
    expect(new Set(definitions.map(definition => definition.desktopBreakpoint))).toEqual(
      new Set([1024]),
    )
    expect(ADMIN_SHELL_METRICS).toMatchObject({
      desktopBreakpointPx: 1024,
      headerHeight: '3.5rem',
      breadcrumbHeight: '2rem',
      tabsHeight: '2.5rem',
      touchTarget: '2.75rem',
    })
  })

  it('defines mixed mode as an explicit primary rail and secondary sidebar split', () => {
    const mixedLayout = getAdminLayoutDefinition('mixed')

    expect(mixedLayout.primaryNavigation).toBe('rail')
    expect(mixedLayout.secondaryNavigation).toBe('sidebar')
    expect(mixedLayout.gridTemplateAreas).toContain('primary secondary body')
    expect(mixedLayout.brandPlacement).toBe('primary')
    expect(mixedLayout.collapseTarget).toBe('secondary')
    expect(mixedLayout.childPresentation).toBe('secondary')
    expect(getAdminNavigationWidths('mixed', true)).toEqual({
      primary: '4.25rem',
      secondary: '0rem',
    })
  })

  it('declares setting applicability and collapse ownership for every mode', () => {
    expect(getAdminLayoutDefinition('top')).toMatchObject({
      brandPlacement: 'header',
      collapseTarget: 'none',
      childPresentation: 'flyout',
      canConfigureStickyHeader: false,
    })
    expect(getAdminLayoutDefinition('sidebar')).toMatchObject({
      brandPlacement: 'primary',
      collapseTarget: 'primary',
      childPresentation: 'inline',
    })
    expect(getAdminNavigationWidths('header-hybrid-header-first', true)).toEqual({
      primary: '0rem',
      secondary: '4.25rem',
    })
  })

  it.each([
    ['sidebar', { primary: '16rem', secondary: '0rem' }, { primary: '4.25rem', secondary: '0rem' }],
    [
      'sidebar-hybrid-header-first',
      { primary: '16rem', secondary: '0rem' },
      { primary: '4.25rem', secondary: '0rem' },
    ],
    [
      'mixed',
      { primary: '4.25rem', secondary: '14rem' },
      { primary: '4.25rem', secondary: '0rem' },
    ],
    [
      'header-hybrid-header-first',
      { primary: '0rem', secondary: '14rem' },
      { primary: '0rem', secondary: '4.25rem' },
    ],
  ] as const)(
    'defines measurable expanded and collapsed widths for %s',
    (layoutMode, expandedWidths, collapsedWidths) => {
      // AI modified: browser motion assertions consume explicit endpoints instead of a broad rail count.
      expect(getAdminNavigationWidths(layoutMode, false)).toEqual(expandedWidths)
      expect(getAdminNavigationWidths(layoutMode, true)).toEqual(collapsedWidths)
    },
  )

  it('renders breadcrumb and tabs inside one context surface with one owned border', () => {
    const wrapper = shallowMount(AdminContextBar, {
      props: {
        hasBreadcrumbIcon: true,
        isBreadcrumbVisible: true,
        isTabsVisible: true,
      },
      // AI modified: the real context bar resolves its accessible name through the app i18n plugin.
      global: { plugins: [i18n] },
    })

    expect(wrapper.attributes('data-layout-region')).toBe('context-bar')
    expect(wrapper.classes()).toContain('border-b')
    expect(wrapper.findAll('app-breadcrumb-stub')).toHaveLength(1)
    expect(wrapper.findAll('admin-tabs-stub')).toHaveLength(1)
    expect(wrapper.get('[data-context-row="breadcrumb"]').classes()).toContain(
      'h-[var(--admin-context-breadcrumb-height)]',
    )
  })
})

describe('tab close navigation', () => {
  const tabs = [
    { id: '/dashboard', isAffix: true },
    { id: '/users', isAffix: false },
    { id: '/roles', isAffix: false },
  ] as const

  it('moves an active middle tab to its right-hand neighbor', () => {
    expect(getActiveTabIdAfterClose(tabs, '/users', '/users')).toBe('/roles')
  })

  it('moves an active last tab to the previous remaining tab', () => {
    expect(getActiveTabIdAfterClose(tabs, '/roles', '/roles')).toBe('/users')
  })

  it('retains the active tab when closing another tab or an affix tab', () => {
    expect(getActiveTabIdAfterClose(tabs, '/dashboard', '/users')).toBe('/dashboard')
    expect(getActiveTabIdAfterClose(tabs, '/dashboard', '/dashboard')).toBe('/dashboard')
  })
})
