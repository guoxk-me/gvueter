import type { VueWrapper } from '@vue/test-utils'
import type { NavigationMenuNode } from '@/features/navigation'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminHeader from '@/components/layout/AdminHeader.vue'
import AdminTopNavigation from '@/components/layout/AdminTopNavigation.vue'
import GlobalSearch from '@/components/layout/GlobalSearch.vue'
import { i18n, setLocale } from '@/i18n'

class TestResizeObserver {
  static instances: TestResizeObserver[] = []

  readonly disconnect = vi.fn()

  constructor(private readonly callback: ResizeObserverCallback) {
    TestResizeObserver.instances.push(this)
  }

  observe(): void {}

  unobserve(): void {}

  notify(): void {
    this.callback([], this as unknown as ResizeObserver)
  }
}

class TestIntersectionObserver {
  readonly root = null
  readonly rootMargin = '0px'
  readonly thresholds = [0]

  disconnect(): void {}

  observe(): void {}

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  unobserve(): void {}
}

const systemParameterNode: NavigationMenuNode = {
  id: 'system-parameters',
  kind: 'menu',
  titleKey: 'nav.systemParameters',
  hidden: false,
  order: 1,
  to: '/settings/system/parameters',
  keepAlive: false,
  children: [],
}

const navigationNodes: NavigationMenuNode[] = [
  {
    id: 'dashboard',
    kind: 'menu',
    titleKey: 'nav.dashboard',
    hidden: false,
    order: 1,
    to: '/dashboard',
    keepAlive: false,
    children: [],
  },
  {
    id: 'components',
    kind: 'menu',
    titleKey: 'nav.components',
    hidden: false,
    order: 2,
    to: '/components',
    keepAlive: false,
    children: [],
  },
  {
    id: 'administration',
    kind: 'menu',
    titleKey: 'nav.administration',
    hidden: false,
    order: 3,
    keepAlive: false,
    children: [
      {
        id: 'settings',
        kind: 'menu',
        titleKey: 'nav.settings',
        hidden: false,
        order: 1,
        keepAlive: false,
        children: [
          {
            id: 'system-config',
            kind: 'menu',
            titleKey: 'nav.systemConfig',
            hidden: false,
            order: 1,
            keepAlive: false,
            children: [systemParameterNode],
          },
        ],
      },
    ],
  },
  {
    id: 'resources',
    kind: 'external',
    titleKey: 'nav.resources',
    hidden: false,
    order: 4,
    href: 'https://docs.example.com',
    keepAlive: false,
    children: [],
  },
]

const mountedWrappers: VueWrapper[] = []
let containerWidth = 300
let menuWidth: (element: HTMLElement) => number = () => 100

function rectangle(width: number): DOMRect {
  return DOMRect.fromRect({ width, height: 36 })
}

async function mountTopNavigation(
  path = '/settings/system/parameters',
  nodes = navigationNodes,
): Promise<VueWrapper> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(AdminTopNavigation, {
    attachTo: document.body,
    props: { nodes },
    global: { plugins: [router, i18n] },
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

function notifyResizeObservers(): void {
  for (const observer of TestResizeObserver.instances) observer.notify()
}

beforeEach(() => {
  setLocale('en-US')
  containerWidth = 300
  menuWidth = () => 100
  TestResizeObserver.instances = []
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
  vi.stubGlobal('IntersectionObserver', TestIntersectionObserver)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      if (this.hasAttribute('data-top-navigation'))
        return rectangle(containerWidth)
      if (this.hasAttribute('data-top-navigation-measure'))
        return rectangle(menuWidth(this))
      if (this.hasAttribute('data-top-navigation-more-measure'))
        return rectangle(80)
      if (this.hasAttribute('data-search-full-measure'))
        return rectangle(180)
      return rectangle(32)
    },
  )
})

afterEach(() => {
  for (const wrapper of mountedWrappers) wrapper.unmount()
  mountedWrappers.length = 0
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('adminTopNavigation', () => {
  it('moves only overflowing branches into a recursive More menu with active semantics', async () => {
    const wrapper = await mountTopNavigation()

    await vi.waitFor(() => expect(wrapper.find('[data-top-navigation-more]').exists()).toBe(true))
    expect(wrapper.find('a[href="/dashboard"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/components"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Administration"]').exists()).toBe(false)

    const moreButton = wrapper.get('[data-top-navigation-more]')
    expect(moreButton.attributes('aria-label')).toBe(
      'More navigation, current page: Administration',
    )
    expect(moreButton.attributes('data-active')).toBe('true')
    await moreButton.trigger('click')
    await flushPromises()

    const activeDestination = document.body.querySelector<HTMLAnchorElement>(
      'a[href="/settings/system/parameters"][aria-current="page"]',
    )
    expect(activeDestination?.textContent).toContain('System Parameters')
    expect(document.body.querySelector('a[href="https://docs.example.com"]')).not.toBeNull()
  })

  it('recalculates after container resize and menu collection changes', async () => {
    const wrapper = await mountTopNavigation('/dashboard')
    await vi.waitFor(() => expect(wrapper.find('[data-top-navigation-more]').exists()).toBe(true))

    containerWidth = 500
    notifyResizeObservers()
    await vi.waitFor(() => expect(wrapper.find('[data-top-navigation-more]').exists()).toBe(false))

    await wrapper.setProps({
      nodes: [
        ...navigationNodes,
        {
          id: 'monitoring',
          kind: 'menu',
          titleKey: 'nav.monitoring',
          hidden: false,
          order: 5,
          to: '/monitoring',
          keepAlive: false,
          children: [],
        },
        {
          id: 'form-workbench',
          kind: 'menu',
          titleKey: 'nav.formWorkbench',
          hidden: false,
          order: 6,
          to: '/form-workbench',
          keepAlive: false,
          children: [],
        },
      ],
    })
    await vi.waitFor(() => expect(wrapper.find('[data-top-navigation-more]').exists()).toBe(true))

    expect(
      wrapper.emitted('overflowChange')?.some(eventArguments => eventArguments[0] === false),
    ).toBe(true)
    const overflowEvents = wrapper.emitted('overflowChange') ?? []
    expect(overflowEvents[overflowEvents.length - 1]).toEqual([true])
  })

  it('remeasures translated labels when locale changes', async () => {
    containerWidth = 260
    menuWidth = element => 40 + (element.textContent?.trim().length ?? 0) * 7
    const translatedNodes = [
      navigationNodes[1]!,
      {
        id: 'form-workbench',
        kind: 'menu' as const,
        titleKey: 'nav.formWorkbench',
        hidden: false,
        order: 2,
        to: '/form-workbench',
        keepAlive: false,
        children: [],
      },
      {
        id: 'content-admin',
        kind: 'menu' as const,
        titleKey: 'nav.contentAdmin',
        hidden: false,
        order: 3,
        to: '/content-admin',
        keepAlive: false,
        children: [],
      },
    ]
    const wrapper = await mountTopNavigation('/components', translatedNodes)
    await vi.waitFor(() => expect(wrapper.find('[data-top-navigation-more]').exists()).toBe(true))

    setLocale('zh-CN')
    await vi.waitFor(() => expect(wrapper.find('[data-top-navigation-more]').exists()).toBe(false))
    expect(wrapper.findAll('a')).toHaveLength(3)
  })

  it('uses and removes the window resize fallback when ResizeObserver is unavailable', async () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const wrapper = await mountTopNavigation('/dashboard')
    await nextTick()

    expect(addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    wrapper.unmount()
    mountedWrappers.splice(mountedWrappers.indexOf(wrapper), 1)
    expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
  })
})

describe('header degradation contract', () => {
  it('keeps hamburger and desktop navigation on opposite sides of 1024px and compacts search on overflow', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/dashboard', component: { template: '<div />' } },
        { path: '/message-center', component: { template: '<div />' } },
      ],
    })
    await router.push('/dashboard')
    const TopNavigationStub = defineComponent({
      name: 'AdminTopNavigation',
      props: { nodes: { type: Array, required: true }, restorationReserve: Number },
      emits: ['nodeSelected', 'overflowChange'],
      template: '<div data-top-navigation-stub />',
    })
    const SearchStub = defineComponent({
      name: 'GlobalSearch',
      props: { compact: Boolean },
      emits: ['widthReserveChange'],
      template: '<button data-search-stub />',
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = mount(AdminHeader, {
      props: {
        isMobileNavigationOpen: false,
        navigationNodes,
      },
      global: {
        plugins: [createPinia(), router, i18n, [VueQueryPlugin, { queryClient }]],
        stubs: {
          AdminTopNavigation: TopNavigationStub,
          GlobalSearch: SearchStub,
          LanguageToggleButton: true,
        },
      },
    })
    mountedWrappers.push(wrapper)

    expect(wrapper.get('button[aria-controls="admin-mobile-navigation"]').classes()).toContain(
      'lg:hidden',
    )
    expect(wrapper.get('[data-top-navigation-stub]').element.parentElement?.className).toContain(
      'lg:block',
    )
    expect(wrapper.getComponent(SearchStub).props('compact')).toBe(false)

    wrapper.getComponent(TopNavigationStub).vm.$emit('overflowChange', true)
    await nextTick()
    expect(wrapper.getComponent(SearchStub).props('compact')).toBe(true)
  })

  it('keeps compact search icon-only while reporting the full translated width reserve', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
    })
    await router.push('/dashboard')
    const wrapper = mount(GlobalSearch, {
      props: { compact: true },
      global: { plugins: [router, i18n] },
    })
    mountedWrappers.push(wrapper)

    await vi.waitFor(() => {
      const reserveEvents = wrapper.emitted('widthReserveChange') ?? []
      expect(reserveEvents[reserveEvents.length - 1]).toEqual([148])
    })
    const trigger = wrapper.get('button[data-compact="true"]')
    expect(trigger.attributes('aria-label')).toBe('Open global search')
    expect(trigger.text()).not.toContain('Search pages')
    expect(trigger.find('kbd').exists()).toBe(false)

    await trigger.trigger('click')
    await nextTick()
    // AI modified: assert the dialog field through the form semantics exposed to assistive technology.
    const searchInput = document.body.querySelector<HTMLInputElement>('input[name="global-search"]')
    expect(searchInput?.type).toBe('search')
    expect(searchInput?.getAttribute('aria-label')).toBe('Global Search')
  })
})
