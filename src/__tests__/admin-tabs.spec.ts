import type { VueWrapper } from '@vue/test-utils'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, shallowRef } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminRouteOutlet from '@/components/layout/AdminRouteOutlet.vue'
import AdminTabs from '@/components/layout/AdminTabs.vue'
import { i18n, setLocale } from '@/i18n'
import { useAppearanceStore } from '@/stores/appearance'
import { useTabsStore } from '@/stores/tabs'

class TestResizeObserver {
  static instances: TestResizeObserver[] = []

  readonly disconnect = vi.fn()
  readonly observe = vi.fn()

  constructor(private readonly callback: ResizeObserverCallback) {
    TestResizeObserver.instances.push(this)
  }

  notify(): void {
    this.callback([], this as unknown as ResizeObserver)
  }

  unobserve(): void {}
}

interface TabGeometry {
  clientWidth: number
  scrollLeft: number
  scrollWidth: number
}

const mountedWrappers: VueWrapper[] = []

async function mountAdminTabs(): Promise<VueWrapper> {
  const pinia = createPinia()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  await router.push('/dashboard')
  await router.isReady()

  const tabsStore = useTabsStore(pinia)
  tabsStore.openTab({
    id: '/dashboard',
    routeName: 'dashboard',
    fullPath: '/dashboard',
    title: 'Dashboard',
    isKeepAlive: false,
    isAffix: true,
  })
  tabsStore.openTab({
    id: '/users',
    routeName: 'users',
    fullPath: '/users',
    title: 'User Management With A Long Label',
    isKeepAlive: false,
    isAffix: false,
  })
  tabsStore.openTab({
    id: '/settings',
    routeName: 'settings',
    fullPath: '/settings',
    title: 'Settings',
    isKeepAlive: false,
    isAffix: false,
  })

  const wrapper = mount(AdminTabs, {
    attachTo: document.body,
    global: { plugins: [pinia, router, i18n] },
  })
  mountedWrappers.push(wrapper)
  await nextTick()
  return wrapper
}

function applyTabGeometry(element: HTMLElement, geometry: TabGeometry): void {
  Object.defineProperties(element, {
    clientWidth: {
      configurable: true,
      get: () => geometry.clientWidth,
    },
    scrollLeft: {
      configurable: true,
      get: () => geometry.scrollLeft,
      set: (scrollLeft: number) => {
        geometry.scrollLeft = scrollLeft
      },
    },
    scrollWidth: {
      configurable: true,
      get: () => geometry.scrollWidth,
    },
  })
}

beforeEach(() => {
  localStorage.clear()
  setLocale('en-US')
  TestResizeObserver.instances = []
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
})

afterEach(() => {
  for (const wrapper of mountedWrappers) wrapper.unmount()
  mountedWrappers.length = 0
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('adminTabs overflow affordance', () => {
  it('uses one roving tab stop and supports standard horizontal keyboard navigation', async () => {
    const wrapper = await mountAdminTabs()
    let tabs = wrapper.findAll<HTMLButtonElement>('button[role="tab"]')

    expect(tabs.map(tab => tab.attributes('tabindex'))).toEqual(['-1', '-1', '0'])
    tabs[2]!.element.focus()

    await tabs[2]!.trigger('keydown', { key: 'ArrowRight' })
    await flushPromises()
    tabs = wrapper.findAll<HTMLButtonElement>('button[role="tab"]')
    expect(document.activeElement).toBe(tabs[0]!.element)
    expect(tabs.map(tab => tab.attributes('aria-selected'))).toEqual(['true', 'false', 'false'])
    expect(tabs.map(tab => tab.attributes('tabindex'))).toEqual(['0', '-1', '-1'])

    await tabs[0]!.trigger('keydown', { key: 'End' })
    await flushPromises()
    tabs = wrapper.findAll<HTMLButtonElement>('button[role="tab"]')
    expect(document.activeElement).toBe(tabs[2]!.element)

    await tabs[2]!.trigger('keydown', { key: 'Home' })
    await flushPromises()
    tabs = wrapper.findAll<HTMLButtonElement>('button[role="tab"]')
    expect(document.activeElement).toBe(tabs[0]!.element)

    await tabs[0]!.trigger('keydown', { key: 'ArrowLeft' })
    await flushPromises()
    tabs = wrapper.findAll<HTMLButtonElement>('button[role="tab"]')
    expect(document.activeElement).toBe(tabs[2]!.element)
  })

  it('keeps close affordances inside one semantic tab action and restores focus', async () => {
    const wrapper = await mountAdminTabs()
    const closeAffordances = wrapper.findAll<HTMLElement>('[data-admin-tab-close]')

    expect(closeAffordances).toHaveLength(2)
    expect(
      closeAffordances.every(affordance => affordance.attributes('aria-hidden') === 'true'),
    ).toBe(true)
    expect(closeAffordances.map(affordance => affordance.attributes('title'))).toEqual([
      'Close User Management With A Long Label',
      'Close Settings',
    ])

    const activeTab = wrapper.findAll<HTMLButtonElement>('button[role="tab"]')[2]!
    expect(activeTab.attributes('aria-keyshortcuts')).toBe('Delete')
    expect(activeTab.attributes('aria-describedby')).toBeTruthy()
    activeTab.element.focus()
    await closeAffordances[1]!.trigger('click')
    await flushPromises()

    const remainingTabs = wrapper.findAll<HTMLButtonElement>('button[role="tab"]')
    expect(remainingTabs).toHaveLength(2)
    expect(remainingTabs.map(tab => tab.attributes('tabindex'))).toEqual(['-1', '0'])
    expect(document.activeElement).toBe(remainingTabs[1]!.element)

    await remainingTabs[1]!.trigger('keydown', { key: 'Delete' })
    await flushPromises()
    expect(wrapper.findAll<HTMLButtonElement>('button[role="tab"]')).toHaveLength(1)
  })

  it('reports the real left and right scroll boundaries without changing tab semantics', async () => {
    const wrapper = await mountAdminTabs()
    await vi.waitFor(() => expect(TestResizeObserver.instances).toHaveLength(1))
    const observer = TestResizeObserver.instances[0]!
    const tabList = wrapper.get<HTMLElement>('[role="tablist"]')
    const geometry: TabGeometry = { clientWidth: 240, scrollLeft: 0, scrollWidth: 600 }
    applyTabGeometry(tabList.element, geometry)

    observer.notify()
    await nextTick()

    expect(tabList.attributes('aria-label')).toBe('Open page tabs')
    expect(tabList.findAll('button[role="tab"]')).toHaveLength(3)
    expect(tabList.findAll('button[role="tab"]')[2]?.attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[data-tabs-overflow-left]').attributes('data-visible')).toBe('false')
    expect(wrapper.get('[data-tabs-overflow-right]').attributes('data-visible')).toBe('true')
    expect(wrapper.get('[role="status"]').text()).toBe('More page tabs are available to the right.')
    expect(tabList.attributes('aria-describedby')).toBe(
      wrapper.get('[role="status"]').attributes('id'),
    )

    geometry.scrollLeft = 120
    await tabList.trigger('scroll')
    expect(wrapper.get('[data-tabs-overflow-left]').attributes('data-visible')).toBe('true')
    expect(wrapper.get('[data-tabs-overflow-right]').attributes('data-visible')).toBe('true')
    expect(wrapper.get('[role="status"]').text()).toBe(
      'More page tabs are available to the left and right.',
    )

    geometry.scrollLeft = 360
    await tabList.trigger('scroll')
    expect(wrapper.get('[data-tabs-overflow-left]').attributes('data-visible')).toBe('true')
    expect(wrapper.get('[data-tabs-overflow-right]').attributes('data-visible')).toBe('false')
    expect(wrapper.get('[role="status"]').text()).toBe('More page tabs are available to the left.')

    geometry.clientWidth = 600
    observer.notify()
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(tabList.attributes('aria-describedby')).toBeUndefined()
  })

  it('uses and removes the window resize fallback when ResizeObserver is unavailable', async () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const wrapper = await mountAdminTabs()
    await vi.waitFor(() => {
      expect(addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    })
    const tabList = wrapper.get<HTMLElement>('[role="tablist"]')
    const geometry: TabGeometry = { clientWidth: 200, scrollLeft: 0, scrollWidth: 500 }
    applyTabGeometry(tabList.element, geometry)

    window.dispatchEvent(new Event('resize'))
    await nextTick()
    expect(wrapper.get('[data-tabs-overflow-right]').attributes('data-visible')).toBe('true')

    wrapper.unmount()
    mountedWrappers.splice(mountedWrappers.indexOf(wrapper), 1)
    expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('disconnects observed tab geometry when unmounted', async () => {
    const wrapper = await mountAdminTabs()
    await vi.waitFor(() => expect(TestResizeObserver.instances).toHaveLength(1))
    const observer = TestResizeObserver.instances[0]!
    const disconnectCount = observer.disconnect.mock.calls.length

    wrapper.unmount()
    mountedWrappers.splice(mountedWrappers.indexOf(wrapper), 1)

    expect(observer.disconnect).toHaveBeenCalledTimes(disconnectCount + 1)
  })
})

describe('adminRouteOutlet cached route identity', () => {
  it('updates query state in the active logical tab without opening a duplicate', async () => {
    const pinia = createPinia()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/records',
          name: 'records',
          component: { template: '<main />' },
          meta: {
            requiresAuth: true,
            tab: true,
            keepAlive: true,
            cacheKey: 'CachedQueryPage',
          },
        },
      ],
    })
    const tabsStore = useTabsStore(pinia)

    await router.push('/records?view=first')
    tabsStore.openRouteTab(router.currentRoute.value)
    await router.push('/records?view=second')
    tabsStore.openRouteTab(router.currentRoute.value)

    expect(tabsStore.tabs).toHaveLength(1)
    expect(tabsStore.activeTabId).toBe('/records?view=first')
    expect(tabsStore.activeTab?.fullPath).toBe('/records?view=second')
  })

  it('renders the next cached route when a CSS page transition changes the full-path key', async () => {
    const browserGetComputedStyle = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudoElement) => {
      const styles = browserGetComputedStyle(element, pseudoElement)
      return new Proxy(styles, {
        get(target, property, receiver) {
          if (property === 'transitionDelay')
            return '0s'
          if (property === 'transitionDuration')
            return '0.16s'
          if (property === 'transitionProperty')
            return 'opacity, transform'
          return Reflect.get(target, property, receiver)
        },
      })
    })
    const CachedQueryPage = defineComponent({
      name: 'CachedQueryPage',
      template: '<main><h1>{{ $route.query.view }}</h1></main>',
    })
    const pinia = createPinia()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/records', name: 'records', component: CachedQueryPage }],
    })
    await router.push('/records?view=first')
    await router.isReady()

    const tabsStore = useTabsStore(pinia)
    for (const fullPath of ['/records?view=first', '/records?view=second']) {
      tabsStore.openTab({
        id: fullPath,
        routeName: 'records',
        fullPath,
        title: fullPath,
        cacheKey: 'CachedQueryPage',
        isKeepAlive: true,
        isAffix: false,
      })
    }
    tabsStore.activateTab('/records?view=first')
    useAppearanceStore(pinia).setPageTransition('fade-slide')

    const wrapper = mount(AdminRouteOutlet, {
      attachTo: document.body,
      global: {
        plugins: [pinia, router],
        stubs: { transition: false },
      },
    })
    mountedWrappers.push(wrapper)
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('first')

    // AI modified: the regression waits past the real CSS duration so an out-in deadlock cannot hide behind an intermediate frame.
    tabsStore.activateTab('/records?view=second')
    await router.push('/records?view=second')
    await flushPromises()
    await new Promise(resolve => globalThis.setTimeout(resolve, 50))
    expect(wrapper.findAll('h1').some(heading => heading.text() === 'second')).toBe(true)
    // AI modified: the outgoing animated page stays visual but leaves the accessibility tree immediately.
    expect(
      wrapper
        .findAll('h1')
        .filter(heading => heading.element.closest('[aria-hidden="true"]') === null),
    ).toHaveLength(1)
    await new Promise(resolve => globalThis.setTimeout(resolve, 250))
    expect(wrapper.get('h1').text()).toBe('second')
  })

  it('keeps separate state for query-specific tabs and restores the first tab instance', async () => {
    const CachedQueryPage = defineComponent({
      name: 'CachedQueryPage',
      setup() {
        const draft = shallowRef('')
        return { draft }
      },
      template: '<label>Tab draft<input aria-label="Tab draft" v-model="draft" /></label>',
    })
    const pinia = createPinia()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/records', name: 'records', component: CachedQueryPage }],
    })
    await router.push('/records?view=first')
    await router.isReady()

    const tabsStore = useTabsStore(pinia)
    for (const fullPath of ['/records?view=first', '/records?view=second']) {
      tabsStore.openTab({
        id: fullPath,
        routeName: 'records',
        fullPath,
        title: fullPath,
        cacheKey: 'CachedQueryPage',
        isKeepAlive: true,
        isAffix: false,
      })
    }
    tabsStore.activateTab('/records?view=first')
    useAppearanceStore(pinia).setPageTransition('none')

    const wrapper = mount(AdminRouteOutlet, {
      attachTo: document.body,
      global: { plugins: [pinia, router] },
    })
    mountedWrappers.push(wrapper)
    await flushPromises()

    // AI modified: visible draft state proves query-specific tabs own independent cached instances.
    await wrapper.get<HTMLInputElement>('input[aria-label="Tab draft"]').setValue('first draft')
    tabsStore.activateTab('/records?view=second')
    await router.push('/records?view=second')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Tab draft"]').element.value).toBe('')

    await wrapper.get<HTMLInputElement>('input[aria-label="Tab draft"]').setValue('second draft')
    tabsStore.activateTab('/records?view=first')
    await router.push('/records?view=first')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Tab draft"]').element.value).toBe(
      'first draft',
    )

    tabsStore.activateTab('/records?view=second')
    await router.push('/records?view=second')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('input[aria-label="Tab draft"]').element.value).toBe(
      'second draft',
    )
  })
})

describe('tabs storage resilience', () => {
  it('keeps principal tabs usable in memory when persistent storage is unavailable', () => {
    const originalGetItem = Storage.prototype.getItem
    const originalRemoveItem = Storage.prototype.removeItem
    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (
      this: Storage,
      key: string,
    ): string | null {
      if (key.startsWith('admin-tabs'))
        throw new DOMException('Storage access denied', 'SecurityError')
      return originalGetItem.call(this, key)
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (
      this: Storage,
      key: string,
    ): void {
      if (key.startsWith('admin-tabs'))
        throw new DOMException('Storage access denied', 'SecurityError')
      originalRemoveItem.call(this, key)
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      storedValue: string,
    ): void {
      if (key.startsWith('admin-tabs'))
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError')
      originalSetItem.call(this, key, storedValue)
    })
    const tabsStore = useTabsStore(createPinia())

    expect(() => tabsStore.bindPrincipal('tenant-a:1')).not.toThrow()
    expect(() =>
      tabsStore.openTab({
        id: '/dashboard',
        routeName: 'dashboard',
        fullPath: '/dashboard',
        isKeepAlive: false,
        isAffix: true,
      }),
    ).not.toThrow()
    expect(tabsStore.activeTabId).toBe('/dashboard')
    expect(tabsStore.tabs.map(tab => tab.fullPath)).toEqual(['/dashboard'])
  })
})
