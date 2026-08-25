import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  getAllowedUrlListState,
  getAllowedUrlStringState,
  useAllowedUrlState,
} from '@/composables/use-allowed-url-state'

enableAutoUnmount(afterEach)

describe('allowlisted URL state contract', () => {
  it('rejects ambiguous strings and constrains list entries to a deduplicated allowlist', () => {
    expect(getAllowedUrlStringState('logs', ['sessions', 'logs'], 'sessions')).toBe('logs')
    expect(getAllowedUrlStringState(['logs', 'sessions'], ['sessions', 'logs'], 'sessions')).toBe(
      'sessions',
    )
    expect(getAllowedUrlStringState('__proto__', ['sessions', 'logs'], 'sessions')).toBe('sessions')

    expect(
      getAllowedUrlListState(
        ['finance', 'unknown', 'finance', 'identity'],
        ['finance', 'identity'],
        ['finance'],
        'none',
      ),
    ).toEqual(['finance', 'identity'])
    expect(getAllowedUrlListState('none', ['finance', 'identity'], ['finance'], 'none')).toEqual([])
    expect(getAllowedUrlListState(undefined, ['finance', 'identity'], ['finance'], 'none')).toEqual(
      ['finance'],
    )
  })

  it('preserves unrelated query state and restores string/list state through browser history', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/example', component: { template: '<div />' } }],
    })
    await router.push('/example?tab=logs&tree=finance&tree=unknown&keep=audit')
    await router.isReady()

    const UrlStateHarness = defineComponent({
      setup() {
        const activeTab = useAllowedUrlState({
          kind: 'string',
          queryKey: 'tab',
          allowedStates: ['sessions', 'logs'] as const,
          defaultState: 'sessions',
          history: 'push',
        })
        const expandedNodes = useAllowedUrlState({
          kind: 'list',
          queryKey: 'tree',
          allowedStates: ['finance', 'identity'] as const,
          defaultState: ['finance'],
          emptyStateToken: 'none',
          history: 'push',
        })

        return { activeTab, expandedNodes }
      },
      template: `
        <div>
          <output data-testid="route-state">{{ activeTab }}|{{ expandedNodes.join(',') }}</output>
          <button data-testid="sessions" type="button" @click="activeTab = 'sessions'">Sessions</button>
          <button data-testid="identity" type="button" @click="expandedNodes = ['identity']">Identity</button>
          <button data-testid="collapse" type="button" @click="expandedNodes = []">Collapse</button>
        </div>
      `,
    })
    const wrapper = mount(UrlStateHarness, { global: { plugins: [router] } })

    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="route-state"]').text()).toBe('logs|finance')
      expect(router.currentRoute.value.query).toEqual({ tab: 'logs', keep: 'audit' })
    })

    await wrapper.get('[data-testid="sessions"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.query).toEqual({ keep: 'audit' }))
    await wrapper.get('[data-testid="identity"]').trigger('click')
    await vi.waitFor(() =>
      expect(router.currentRoute.value.query).toEqual({ tree: ['identity'], keep: 'audit' }),
    )
    await wrapper.get('[data-testid="collapse"]').trigger('click')
    await vi.waitFor(() =>
      expect(router.currentRoute.value.query).toEqual({ tree: 'none', keep: 'audit' }),
    )

    router.back()
    await flushPromises()
    await vi.waitFor(() =>
      expect(wrapper.get('[data-testid="route-state"]').text()).toBe('sessions|identity'),
    )
    router.back()
    await flushPromises()
    await vi.waitFor(() =>
      expect(wrapper.get('[data-testid="route-state"]').text()).toBe('sessions|finance'),
    )
    router.back()
    await flushPromises()
    await vi.waitFor(() =>
      expect(wrapper.get('[data-testid="route-state"]').text()).toBe('logs|finance'),
    )
  })
})
