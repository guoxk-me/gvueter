import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { PAGE_STATE_CONTRACTS, PAGE_STATE_KINDS, PageStatePanel } from '@/components/admin'
import PageStateGallery from '@/features/component-gallery/components/PageStateGallery.vue'
import { i18n } from '@/i18n'

enableAutoUnmount(afterEach)

describe('page-state taxonomy', () => {
  it('defines one contract for every typed state and explicit retry/recovery policies', () => {
    expect(Object.keys(PAGE_STATE_CONTRACTS)).toEqual([...PAGE_STATE_KINDS])
    expect(PAGE_STATE_CONTRACTS.error.recoveryActions).toContain('retry')
    expect(PAGE_STATE_CONTRACTS['fatal-error']).toMatchObject({
      surface: 'global-boundary',
      blocksContent: true,
      recoveryActions: ['reload'],
    })
    expect(PAGE_STATE_CONTRACTS.offline.surface).toBe('global-boundary')
    expect(PAGE_STATE_CONTRACTS.forbidden.recoveryActions).toEqual(['return'])
    expect(PAGE_STATE_CONTRACTS.conflict.recoveryActions).toEqual(['reload', 'review'])
    expect(PAGE_STATE_CONTRACTS['partial-success'].blocksContent).toBe(false)
    expect(PAGE_STATE_CONTRACTS['session-expired'].recoveryActions).toEqual(['sign-in'])
  })

  it('exposes assertive failures, busy progress, and native recovery events', async () => {
    const errorPanel = mount(PageStatePanel, {
      props: {
        state: 'error',
        title: 'Unable to load',
        description: 'Try again.',
        primaryActionLabel: 'Retry',
      },
    })
    expect(errorPanel.attributes('role')).toBe('alert')
    expect(errorPanel.attributes('aria-live')).toBe('assertive')
    await errorPanel.get('button').trigger('click')
    expect(errorPanel.emitted('primaryAction')).toHaveLength(1)

    const loadingPanel = mount(PageStatePanel, {
      props: { state: 'loading', title: 'Loading' },
    })
    expect(loadingPanel.attributes('role')).toBe('status')
    expect(loadingPanel.attributes('aria-busy')).toBe('true')

    const fatalPanel = mount(PageStatePanel, {
      props: { state: 'fatal-error', title: 'Application failed', headingLevel: 1 },
    })
    expect(fatalPanel.get('h1').text()).toBe('Application failed')
  })

  it('lets the Gallery recover an actionable state back to ready', async () => {
    const wrapper = mount(PageStateGallery, { global: { plugins: [i18n] } })
    const stateButtons = wrapper.findAll('[aria-label="Page states"] button')
    const errorIndex = PAGE_STATE_KINDS.indexOf('error')

    await stateButtons[errorIndex]!.trigger('click')
    expect(wrapper.get('[data-page-state="error"]').attributes('role')).toBe('alert')
    await wrapper.get('[data-page-state="error"] button').trigger('click')

    expect(wrapper.find('[data-page-state="ready"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="page-state-recovery-message"]').text()).not.toBe('')
    expect(wrapper.findAll('[data-state-contract]')).toHaveLength(PAGE_STATE_KINDS.length)
  })
})
