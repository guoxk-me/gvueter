import type { VueWrapper } from '@vue/test-utils'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import IframePage from '@/features/navigation/IframePage.vue'
import { i18n, setLocale } from '@/i18n'

const FIRST_SOURCE = '/embedded-help.html'
const SECOND_SOURCE = 'https://docs.example.test/guide'
const mountedPages: VueWrapper[] = []

async function mountIframePage(path = '/first'): Promise<VueWrapper> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/first',
        component: IframePage,
        meta: {
          title: 'Embedded help',
          iframeUrl: FIRST_SOURCE,
        },
      },
      {
        path: '/second',
        component: IframePage,
        meta: {
          title: 'External guide',
          iframeUrl: SECOND_SOURCE,
        },
      },
    ],
  })
  await router.push(path)
  await router.isReady()

  const wrapper = mount(IframePage, {
    attachTo: document.body,
    global: { plugins: [router, i18n] },
  })
  mountedPages.push(wrapper)
  return wrapper
}

beforeEach(() => {
  setLocale('en-US')
})

afterEach(() => {
  for (const mountedPage of mountedPages) mountedPage.unmount()
  mountedPages.length = 0
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('IframePage lifecycle', () => {
  it('preserves the iframe security contract and exposes source and recovery actions', async () => {
    const wrapper = await mountIframePage()
    const frame = wrapper.get('iframe')
    const externalLink = wrapper.get('a[aria-label="Open in a new window"]')

    expect(wrapper.text()).toContain('Loading embedded content')
    expect(wrapper.text()).toContain('Embedded content is provided by')
    // AI modified: iframe chrome uses shared status and separator primitives with Button icon metadata.
    expect(wrapper.get('[data-slot="badge"][role="status"]').text()).toContain('Loading')
    expect(wrapper.find('[data-slot="separator"]').exists()).toBe(true)
    expect(
      wrapper.get('button[aria-label="Refresh embedded page"] svg').attributes('data-icon'),
    ).toBe('inline-start')
    expect(externalLink.get('svg').attributes('data-icon')).toBe('inline-start')
    expect(frame.attributes()).toMatchObject({
      src: FIRST_SOURCE,
      title: 'Embedded help',
      loading: 'lazy',
      referrerpolicy: 'strict-origin-when-cross-origin',
      sandbox: 'allow-forms allow-popups allow-scripts',
      tabindex: '-1',
      'aria-hidden': 'true',
    })
    expect(externalLink.attributes()).toMatchObject({
      href: FIRST_SOURCE,
      target: '_blank',
      rel: 'noopener noreferrer',
    })

    await frame.trigger('load')

    expect(wrapper.text()).toContain('Ready')
    expect(wrapper.text()).not.toContain('Loading embedded content')
    expect(wrapper.get('iframe').attributes('tabindex')).toBe('0')

    await wrapper.get('button[aria-label="Refresh embedded page"]').trigger('click')

    expect(wrapper.text()).toContain('Loading embedded content')
    expect(wrapper.get('iframe').attributes('tabindex')).toBe('-1')
  })

  it('shows browser errors, retries, and accepts a late successful load', async () => {
    const wrapper = await mountIframePage()

    await wrapper.get('iframe').trigger('error')

    expect(wrapper.text()).toContain('Embedded content could not be loaded')
    const retryButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Try again'))
    expect(retryButton).toBeDefined()

    await retryButton!.trigger('click')

    expect(wrapper.text()).toContain('Loading embedded content')

    await wrapper.get('iframe').trigger('error')

    await wrapper.get('iframe').trigger('load')

    expect(wrapper.text()).toContain('Ready')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('uses a timeout fallback and recovers when the source loads late', async () => {
    vi.useFakeTimers()
    const wrapper = await mountIframePage()

    vi.advanceTimersByTime(15_000)
    await nextTick()

    expect(wrapper.text()).toContain('Embedded content is taking too long')
    expect(wrapper.get('[role="alert"]').text()).toContain('Try again')

    await wrapper.get('iframe').trigger('load')

    expect(wrapper.text()).toContain('Ready')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('resets loading state when the route source changes', async () => {
    const wrapper = await mountIframePage()
    const router = wrapper.vm.$router
    await wrapper.get('iframe').trigger('load')

    await router.push('/second')
    await flushPromises()

    expect(wrapper.text()).toContain('Loading embedded content')
    expect(wrapper.text()).toContain('https://docs.example.test')
    expect(wrapper.get('iframe').attributes('src')).toBe(SECOND_SOURCE)
    expect(wrapper.get('a[aria-label="Open in a new window"]').attributes('href')).toBe(
      SECOND_SOURCE,
    )
  })
})
