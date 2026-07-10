import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vite-plus/test'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../App.vue'

describe('App', () => {
  it('mounts without errors', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div>home</div>' } }],
    })
    const pinia = createPinia()
    const wrapper = mount(App, {
      global: { plugins: [router, pinia] },
    })
    expect(wrapper.exists()).toBe(true)
  })
})
