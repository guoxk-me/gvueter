import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'
import AsyncState from '@/components/admin/AsyncState.vue'
import { i18n } from '@/i18n'
import { ApiError } from '@/lib/http'

describe('AsyncState error contract', () => {
  it('applies loading, error, empty, and success precedence and emits retry', async () => {
    const wrapper = mount(AsyncState, {
      props: {
        isLoading: true,
        error: 'Retryable failure',
        isEmpty: true,
        emptyTitle: 'No records',
      },
      slots: { default: '<p>Loaded records</p>' },
      global: { plugins: [i18n] },
    })

    expect(wrapper.get('[role="status"]').attributes('aria-busy')).toBe('true')
    expect(wrapper.findAll('[data-slot="skeleton"]')).toHaveLength(3)
    expect(wrapper.text()).not.toContain('Retryable failure')

    await wrapper.setProps({ isLoading: false })
    expect(wrapper.get('[role="alert"]').text()).toContain('Retryable failure')
    expect(wrapper.find('[role="alert"] [data-slot="empty"]').exists()).toBe(true)
    const retryButton = wrapper.get('button')
    expect(retryButton.get('svg').attributes('data-icon')).toBe('inline-start')
    await retryButton.trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)

    await wrapper.setProps({ error: null })
    expect(wrapper.text()).toContain('No records')
    await wrapper.setProps({ isEmpty: false })
    expect(wrapper.text()).toContain('Loaded records')
  })

  it('shows the recovery action and request ID from a typed API failure', () => {
    const wrapper = mount(AsyncState, {
      props: {
        error: new ApiError(
          'VERSION_CONFLICT',
          'The resource changed on the server',
          409,
          undefined,
          { requestId: 'request-conflict-42' },
        ),
      },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toContain('The resource changed on the server')
    expect(wrapper.text()).toContain('Refresh before applying the change again.')
    expect(wrapper.text()).toContain('Request ID: request-conflict-42')
    expect(wrapper.get('button').text()).toContain('Try again')
  })

  it('preserves the existing string error and custom error slot contract', () => {
    const wrapper = mount(AsyncState, {
      props: { error: 'Static failure' },
      slots: {
        error: '<template #error="scope">{{ scope.message }}</template>',
      },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toBe('Static failure')
  })

  it('preserves custom loading and empty slot contracts', async () => {
    const wrapper = mount(AsyncState, {
      props: { isLoading: true, isEmpty: true },
      slots: {
        loading: '<p>Custom loading state</p>',
        empty: '<p>Custom empty state</p>',
      },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toBe('Custom loading state')
    expect(wrapper.find('[data-slot="skeleton"]').exists()).toBe(false)

    await wrapper.setProps({ isLoading: false })
    expect(wrapper.text()).toBe('Custom empty state')
  })

  it('announces default loading and error states through live semantics', () => {
    const loadingWrapper = mount(AsyncState, {
      props: { isLoading: true },
      global: { plugins: [i18n] },
    })
    expect(loadingWrapper.get('[role="status"]').attributes('aria-live')).toBe('polite')
    expect(loadingWrapper.get('.sr-only').text()).toBe('Loading...')

    const errorWrapper = mount(AsyncState, {
      props: { error: 'Static failure' },
      global: { plugins: [i18n] },
    })
    expect(errorWrapper.get('[role="alert"]').text()).toContain('Static failure')
  })
})
