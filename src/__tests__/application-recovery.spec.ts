import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { defineComponent } from 'vue'
import ApplicationErrorBoundary from '@/components/admin/ApplicationErrorBoundary.vue'
import { i18n, setLocale } from '@/i18n'
import {
  applicationFailure,
  clearApplicationFailure,
  installApplicationPreloadRecovery,
  reportApplicationFailure,
  setApplicationFailure,
  showBootstrapRecovery,
} from '@/lib/application-recovery'
import { registerFrontendErrorReporter } from '@/lib/observability'

enableAutoUnmount(afterEach)

beforeEach(() => {
  clearApplicationFailure()
  setLocale('en-US')
})

afterEach(() => {
  clearApplicationFailure()
  document.body.innerHTML = ''
})

describe('application recovery state', () => {
  it('keeps the first visible failure and stores no raw diagnostic payload', () => {
    setApplicationFailure('vue-runtime')
    setApplicationFailure('navigation', { routeName: 'users' })

    expect(applicationFailure.value).toEqual({
      kind: 'vue-runtime',
      occurredAt: expect.any(String),
      routeName: 'users',
    })
    expect(applicationFailure.value).not.toHaveProperty('error')
    expect(applicationFailure.value).not.toHaveProperty('message')
    expect(applicationFailure.value).not.toHaveProperty('fullPath')
  })

  it('prevents Vite from rethrowing preload failures and deduplicates the router follow-up', () => {
    const report = vi.fn()
    const unregisterReporter = registerFrontendErrorReporter('preload-recovery-spec', { report })
    const uninstall = installApplicationPreloadRecovery()
    const chunkFailure = new Error('Chunk owner@example.com token=secret failed')
    const preloadEvent = Object.assign(new Event('vite:preloadError', { cancelable: true }), {
      payload: chunkFailure,
    }) as VitePreloadErrorEvent

    try {
      window.dispatchEvent(preloadEvent)
      reportApplicationFailure('navigation', chunkFailure, { routeName: 'component-icons' })

      expect(preloadEvent.defaultPrevented).toBe(true)
      expect(applicationFailure.value).toMatchObject({
        kind: 'asset-preload',
        routeName: 'component-icons',
      })
      expect(report).toHaveBeenCalledOnce()
      expect(report).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'vite-preload',
          message: expect.not.stringContaining('owner@example.com'),
        }),
      )

      uninstall()
      clearApplicationFailure()
      window.dispatchEvent(
        Object.assign(new Event('vite:preloadError', { cancelable: true }), {
          payload: new Error('Later chunk failure'),
        }) as VitePreloadErrorEvent,
      )
      expect(applicationFailure.value).toBeUndefined()
      expect(report).toHaveBeenCalledOnce()
    } finally {
      uninstall()
      unregisterReporter()
    }
  })

  it('replaces a broken descendant with a generic, focused reload surface', async () => {
    const reloadApplication = vi.fn()
    const report = vi.fn()
    const unregisterReporter = registerFrontendErrorReporter('boundary-recovery-spec', { report })
    const BrokenPage = defineComponent({
      name: 'BrokenPage',
      setup() {
        throw new Error('Never expose token=secret or owner@example.com')
      },
      template: '<div>unreachable</div>',
    })
    try {
      const wrapper = mount(ApplicationErrorBoundary, {
        attachTo: document.body,
        props: { reloadApplication },
        slots: { default: BrokenPage },
        global: { plugins: [i18n] },
      })

      await flushPromises()

      expect(wrapper.get('[data-application-recovery="vue-runtime"]').attributes('tabindex')).toBe(
        '-1',
      )
      expect(wrapper.get('[data-page-state="fatal-error"]').attributes('role')).toBe('alert')
      expect(wrapper.get('h1').text()).toBe('The application cannot continue')
      expect(wrapper.text()).not.toContain('token=secret')
      expect(wrapper.text()).not.toContain('owner@example.com')
      expect(document.activeElement).toBe(
        wrapper.get('[data-application-recovery="vue-runtime"]').element,
      )
      expect(report).toHaveBeenCalledOnce()

      await wrapper.get('button').trigger('click')
      expect(reloadApplication).toHaveBeenCalledOnce()
    } finally {
      unregisterReporter()
    }
  })

  it('renders a plugin-independent bootstrap fallback with a native reload action', () => {
    const target = document.implementation.createHTMLDocument('bootstrap failure')
    const mountTarget = target.createElement('div')
    const reloadApplication = vi.fn()
    target.documentElement.lang = 'zh-CN'
    mountTarget.id = 'app'
    target.body.append(mountTarget)

    showBootstrapRecovery(target, reloadApplication)

    expect(
      target.querySelector('[data-application-recovery="bootstrap"]')?.getAttribute('role'),
    ).toBe('alert')
    expect(target.querySelector('h1')?.textContent).toBe('应用启动失败')
    target.querySelector('button')?.click()
    expect(reloadApplication).toHaveBeenCalledOnce()
  })
})
