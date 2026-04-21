import { describe, it, expect } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
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
