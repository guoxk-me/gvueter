import type { VueWrapper } from '@vue/test-utils'
import type { AdminNavigationVariant } from '@/components/layout/layout-contract'
import type { NavigationMenuNode } from '@/features/navigation'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import AdminNavigation from '@/components/layout/AdminNavigation.vue'
import { i18n, setLocale } from '@/i18n'

const deepestNode: NavigationMenuNode = {
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
    id: 'administration',
    kind: 'menu',
    titleKey: 'nav.administration',
    hidden: false,
    order: 1,
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
            children: [deepestNode],
          },
        ],
      },
    ],
  },
]

const mountedNavigations: VueWrapper[] = []

interface MountNavigationOptions {
  path: string
  variant?: AdminNavigationVariant
  collapsed?: boolean
}

async function mountNavigation(options: MountNavigationOptions): Promise<VueWrapper> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/:pathMatch(.*)*',
        component: { template: '<div />' },
      },
    ],
  })
  await router.push(options.path)
  await router.isReady()

  const wrapper = mount(AdminNavigation, {
    attachTo: document.body,
    props: {
      nodes: navigationNodes,
      variant: options.variant,
      collapsed: options.collapsed,
    },
    global: { plugins: [router, i18n] },
  })
  mountedNavigations.push(wrapper)
  return wrapper
}

function getButton(label: string): HTMLButtonElement {
  const button = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.includes(label),
  )
  if (!button) throw new Error(`Missing navigation button: ${label}`)
  return button
}

beforeEach(() => {
  setLocale('en-US')
})

afterEach(() => {
  for (const navigation of mountedNavigations) navigation.unmount()
  mountedNavigations.length = 0
  document.body.innerHTML = ''
})

describe('AdminNavigation recursive branches', () => {
  it('preserves expandable vertical navigation without accumulating deep rails', async () => {
    const wrapper = await mountNavigation({ path: '/dashboard' })
    const administrationButton = getButton('Administration')

    expect(administrationButton.getAttribute('aria-expanded')).toBe('false')
    expect(document.body.textContent).not.toContain('System Parameters')

    administrationButton.click()
    await nextTick()
    getButton('Settings').click()
    await nextTick()
    getButton('System Configuration').click()
    await nextTick()

    expect(document.body.textContent).toContain('System Parameters')
    expect(document.body.querySelectorAll('ul.border-l')).toHaveLength(1)

    const destination = document.body.querySelector<HTMLAnchorElement>(
      'a[href="/settings/system/parameters"]',
    )
    expect(destination).not.toBeNull()
    destination!.click()
    await flushPromises()

    expect(wrapper.emitted('nodeSelected')?.slice(-1)[0]).toEqual([deepestNode])
  })

  it('opens a collapsed branch with Enter and Space, then returns focus after Escape', async () => {
    await mountNavigation({
      path: '/settings/system/parameters',
      collapsed: true,
    })
    const trigger = document.body.querySelector<HTMLButtonElement>('button[title="Administration"]')
    expect(trigger).not.toBeNull()
    expect(trigger!.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger!.getAttribute('aria-expanded')).toBe('false')
    expect(trigger!.className).toContain('bg-sidebar-accent')

    trigger!.focus()
    trigger!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await nextTick()

    expect(trigger!.getAttribute('aria-expanded')).toBe('true')
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
    expect(document.body.querySelector('a[aria-current="page"]')?.textContent).toContain(
      'System Parameters',
    )

    document.body
      .querySelector('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()

    expect(trigger!.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)

    trigger!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    await nextTick()
    expect(trigger!.getAttribute('aria-expanded')).toBe('true')
  })

  it('opens a rail flyout by mouse and closes it after a recursive destination is selected', async () => {
    const wrapper = await mountNavigation({
      path: '/dashboard',
      variant: 'rail',
    })
    const trigger = document.body.querySelector<HTMLButtonElement>('button[title="Administration"]')

    trigger!.click()
    await nextTick()

    getButton('Settings').click()
    await nextTick()
    expect(trigger!.getAttribute('aria-expanded')).toBe('true')
    getButton('System Configuration').click()
    await nextTick()

    const deepDestination = document.body.querySelector<HTMLAnchorElement>(
      'a[href="/settings/system/parameters"]',
    )
    expect(deepDestination?.textContent).toContain('System Parameters')
    deepDestination!.click()
    await flushPromises()

    expect(trigger!.getAttribute('aria-expanded')).toBe('false')
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
    expect(wrapper.emitted('nodeSelected')?.slice(-1)[0]).toEqual([deepestNode])
  })

  it('keeps a pointer-opened horizontal branch focused so Escape closes it', async () => {
    await mountNavigation({
      path: '/settings/system/parameters',
      variant: 'horizontal',
    })
    const trigger = document.body.querySelector<HTMLButtonElement>('button[title="Administration"]')
    expect(trigger).not.toBeNull()

    trigger!.click()
    await nextTick()

    // AI modified: this models Safari, where native pointer clicks do not focus buttons.
    expect(document.activeElement).toBe(trigger)
    expect(trigger!.getAttribute('aria-expanded')).toBe('true')
    trigger!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(trigger!.getAttribute('aria-expanded')).toBe('false')
  })
})
