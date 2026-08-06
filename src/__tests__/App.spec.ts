import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../App.vue'
import { i18n } from '../i18n'
import { clearApplicationFailure } from '../lib/application-recovery'

afterEach(() => clearApplicationFailure())

describe('App', () => {
  it('renders routed content through the application recovery boundary', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div>home</div>' } }],
    })
    const pinia = createPinia()
    await router.push('/')
    await router.isReady()
    const wrapper = mount(App, {
      global: { plugins: [router, pinia, i18n] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('home')
    expect(wrapper.find('[data-application-recovery]').exists()).toBe(false)
  })
})
