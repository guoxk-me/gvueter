import type { VueWrapper } from '@vue/test-utils'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick } from 'vue'
import { toast } from 'vue-sonner'
import { Toaster } from '@/components/ui/sonner'
import { uiPrimitiveCatalog } from '@/features/component-gallery/component-catalog'
import PrimitiveOverlayExamples from '@/features/component-gallery/primitives/components/PrimitiveOverlayExamples.vue'
import PrimitiveShowcase from '@/features/component-gallery/primitives/components/PrimitiveShowcase.vue'
import PrimitiveStructureExamples from '@/features/component-gallery/primitives/components/PrimitiveStructureExamples.vue'
import {
  getPrimitiveExamplesCopy,
  getPrimitiveGapDecisions,
} from '@/features/component-gallery/primitives/primitive-examples'
import PrimitiveExamplesPage from '@/features/component-gallery/primitives/PrimitiveExamplesPage.vue'
import { i18n, setLocale } from '@/i18n'
import adminRoutes from '@/router/routes/admin'

enableAutoUnmount(afterEach)

const expectedDirectDemoIds = [
  'ui-breadcrumb',
  'ui-dialog',
  'ui-dropdown-menu',
  'ui-form',
  'ui-pagination',
  'ui-resizable',
  'ui-scroll-area',
  'ui-separator',
  'ui-sheet',
  'ui-sidebar',
  'ui-skeleton',
  'ui-sonner',
  'ui-table',
  'ui-tooltip',
] as const

const requestedGapIds = [
  'accordion',
  'alert',
  'alert-dialog',
  'calendar-date-picker',
  'carousel',
  'command-combobox',
  'context-menu',
  'hover-card',
  'menubar',
  'navigation-menu',
  'otp',
  'radio',
  'slider',
  'toggle-group',
] as const

class PrimitiveResizeObserver implements ResizeObserver {
  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
}

function mountPrimitiveShowcase(): VueWrapper {
  return mount(PrimitiveShowcase, {
    attachTo: document.body,
    props: { primitiveCount: uiPrimitiveCatalog.length },
    global: { plugins: [i18n] },
  })
}

function openKeyboardMenu(trigger: HTMLButtonElement): void {
  trigger.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }))
}

beforeEach(() => {
  setLocale('en-US')
  document.body.innerHTML = ''
  vi.stubGlobal('ResizeObserver', PrimitiveResizeObserver)
})

afterEach(() => {
  toast.dismiss()
  vi.unstubAllGlobals()
})

describe('primitive catalog route', () => {
  it('keeps the installed 27-entry catalog authoritative and wires the dedicated route', () => {
    expect(uiPrimitiveCatalog).toHaveLength(27)
    expect(new Set(uiPrimitiveCatalog.map((primitive) => primitive.id)).size).toBe(27)
    expect(uiPrimitiveCatalog.every((primitive) => primitive.kind === 'ui-primitive')).toBe(true)

    const adminRoot = adminRoutes.find((route) => route.name === 'admin-root')
    const primitivesRoute = adminRoot?.children?.find(
      (route) => route.name === 'component-primitives',
    )
    expect(primitivesRoute?.path).toBe('components/primitives')
    expect(primitivesRoute?.props).toBeUndefined()
    expect(PrimitiveExamplesPage).toBeDefined()
  })

  it('records every requested missing primitive with a reason and current alternative in both locales', () => {
    const englishDecisions = getPrimitiveGapDecisions('en-US')
    const chineseDecisions = getPrimitiveGapDecisions('zh-CN')

    expect(englishDecisions.map((decision) => decision.id).sort()).toEqual(
      [...requestedGapIds].sort(),
    )
    expect(chineseDecisions.map((decision) => decision.id)).toEqual(
      englishDecisions.map((decision) => decision.id),
    )
    expect(englishDecisions.every((decision) => decision.reason.length > 20)).toBe(true)
    expect(englishDecisions.every((decision) => decision.alternative.length > 20)).toBe(true)
    expect(
      englishDecisions.every((decision) => ['defer', 'not-applicable'].includes(decision.status)),
    ).toBe(true)
    expect(
      chineseDecisions.every(
        (decision) =>
          decision.reason !==
          englishDecisions.find((candidate) => candidate.id === decision.id)?.reason,
      ),
    ).toBe(true)
  })
})

describe('primitive live examples', () => {
  it('renders every focused primitive example, semantic structure, and the non-authoritative Sidebar boundary', async () => {
    const wrapper = mountPrimitiveShowcase()
    const renderedDemoIds = new Set(
      wrapper
        .findAll('[data-primitive-demo]')
        .map((demo) => demo.attributes('data-primitive-demo')),
    )

    for (const expectedDemoId of expectedDirectDemoIds)
      expect(renderedDemoIds).toContain(expectedDemoId)

    expect(wrapper.get('[data-primitive-demo="ui-breadcrumb"] nav').attributes('aria-label')).toBe(
      'Example breadcrumb',
    )
    expect(wrapper.get('[data-primitive-demo="ui-separator"]').attributes('role')).toBe('separator')
    expect(wrapper.get('[data-primitive-demo="ui-scroll-area"]').attributes('tabindex')).toBe('0')
    expect(
      wrapper
        .get('[data-primitive-demo="ui-resizable"] [role="separator"]')
        .attributes('aria-label'),
    ).toBe('Resize editor and preview panels')
    expect(wrapper.findAll('[data-primitive-demo="ui-table"] th[scope="col"]')).toHaveLength(3)
    expect(wrapper.findAll('[data-primitive-gap-decision]')).toHaveLength(requestedGapIds.length)
    expect(wrapper.get('[data-primitive-demo="ui-sidebar"]').text()).toContain('not authoritative')
    expect(wrapper.find('[data-slot="sidebar-wrapper"]').exists()).toBe(false)

    setLocale('zh-CN')
    await nextTick()
    expect(wrapper.text()).toContain('一套基础能力，不重复建设业务层')
    expect(wrapper.findAll('[data-primitive-gap-decision]')).toHaveLength(requestedGapIds.length)
  })

  it('validates through Form, changes primitive pagination, and selects a keyboard-reachable menu action', async () => {
    const copy = getPrimitiveExamplesCopy('en-US')
    const wrapper = mount(PrimitiveStructureExamples, {
      attachTo: document.body,
      props: { copy },
      global: { plugins: [i18n] },
    })

    const primitiveForm = wrapper.get('[data-primitive-demo="ui-form"]')
    await primitiveForm.trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Enter a workspace name.')

    await wrapper.get('input[name="workspaceName"]').setValue('Operations workspace')
    await primitiveForm.trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Form contract is valid for Operations workspace.')

    await wrapper.get('[aria-label="Next page"]').trigger('click')
    expect(wrapper.text()).toContain('Page 2 of 5')

    const menuTrigger = wrapper.get<HTMLButtonElement>('[data-slot="dropdown-menu-trigger"]')
    openKeyboardMenu(menuTrigger.element)
    await nextTick()
    await flushPromises()
    const exportAction = [
      ...document.body.querySelectorAll<HTMLElement>('[data-slot="dropdown-menu-item"]'),
    ].find((menuEntry) => menuEntry.textContent?.trim() === 'Export record')
    expect(exportAction).toBeDefined()
    exportAction!.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
    exportAction!.click()
    await nextTick()
    expect(wrapper.text()).toContain('Selected action: Export record')
  })

  it('opens each overlay distinction and keeps Skeleton, Tooltip, and Sonner feedback composable', async () => {
    const copy = getPrimitiveExamplesCopy('en-US')
    mount(Toaster, {
      attachTo: document.body,
      props: { duration: 60_000, position: 'top-right', richColors: true },
    })
    const wrapper = mount(PrimitiveOverlayExamples, {
      attachTo: document.body,
      props: { copy },
      global: { plugins: [i18n] },
    })

    expect(wrapper.get('[data-primitive-demo="ui-skeleton"]').attributes('aria-busy')).toBe('true')
    expect(wrapper.get('[data-testid="finish-primitive-preview"]').attributes('aria-label')).toBe(
      'Refresh preview',
    )
    await wrapper.get('[data-testid="finish-primitive-preview"]').trigger('click')
    await nextTick()
    await flushPromises()
    expect(wrapper.get('[data-testid="primitive-preview-ready"]').text()).toContain(
      'persistent visible status',
    )
    expect(document.body.textContent).toContain('Primitive preview refreshed')

    await wrapper.get('[data-testid="open-primitive-dialog"]').trigger('click')
    await nextTick()
    expect(
      document.body.querySelector('[data-primitive-overlay="dialog"]')?.getAttribute('role'),
    ).toBe('dialog')
    const dialogClose = [
      ...document.body.querySelectorAll<HTMLButtonElement>(
        '[data-primitive-overlay="dialog"] button',
      ),
    ].find((dialogButton) => dialogButton.textContent?.trim() === 'Close')
    dialogClose?.click()
    await nextTick()

    await wrapper.get('[data-testid="open-admin-drawer"]').trigger('click')
    await nextTick()
    expect(document.body.querySelector('[data-primitive-overlay="drawer"]')).not.toBeNull()
    const drawerClose = [
      ...document.body.querySelectorAll<HTMLButtonElement>('[data-slot="sheet-content"] button'),
    ].find((drawerButton) => drawerButton.textContent?.trim() === 'Close')
    drawerClose?.click()
    await nextTick()

    await wrapper.get('[data-testid="open-primitive-sheet"]').trigger('click')
    await nextTick()
    expect(
      document.body.querySelector('[data-primitive-overlay="sheet"]')?.getAttribute('role'),
    ).toBe('dialog')
  })
})
