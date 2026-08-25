import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import CodeEditor from '@/components/admin/CodeEditor.vue'
import JSONViewer from '@/components/admin/JSONViewer.vue'
import AdminHeader from '@/components/layout/AdminHeader.vue'
import AdminWatermark from '@/components/layout/AdminWatermark.vue'
import ConfigurableAdminLayout from '@/components/layout/ConfigurableAdminLayout.vue'
import CaptchaField from '@/features/account/components/CaptchaField.vue'
import SystemParameterFormDialog from '@/features/system-parameters/components/SystemParameterFormDialog.vue'
import { i18n, setLocale } from '@/i18n'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage.vue'

enableAutoUnmount(afterEach)

beforeEach(() => {
  localStorage.clear()
  setLocale('en-US')
})

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      // AI modified: authentication pages exercise their real named back-navigation contract.
      { path: '/login', name: 'login', component: { template: '<div />' } },
      { path: '/dashboard', name: 'dashboard', component: { template: '<div />' } },
      { path: '/message-center', name: 'message-center', component: { template: '<div />' } },
      { path: '/reset-password', name: 'reset-password', component: { template: '<div />' } },
    ],
  })
}

describe('automatic translation boundaries', () => {
  it('preserves code language, source, and serialized JSON without opting labels out', async () => {
    const codeEditor = mount(CodeEditor, {
      props: {
        language: 'typescript',
        label: 'Source code',
        modelValue: 'const permissionId = "system:menu:update"',
      },
      global: { plugins: [i18n] },
    })

    expect(codeEditor.get('textarea').attributes('translate')).toBe('no')
    expect(codeEditor.get('span[translate="no"]').text()).toBe('typescript')
    expect(codeEditor.get('.font-medium').attributes('translate')).toBeUndefined()

    const jsonViewer = mount(JSONViewer, {
      props: { value: { permissionId: 'system:menu:update' } },
      global: { plugins: [i18n] },
    })
    expect(jsonViewer.get('[data-testid="json-content"]').attributes('translate')).toBe('no')

    await jsonViewer.setProps({ value: '{invalid-json' })
    expect(jsonViewer.get('[role="alert"]').attributes('translate')).toBeUndefined()
  })

  it('marks Shell brand surfaces while leaving caller-provided watermark prose translatable', async () => {
    const pinia = createPinia()
    const router = createTestRouter()
    await router.push('/dashboard')
    await router.isReady()

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const header = mount(AdminHeader, {
      props: { isMobileNavigationOpen: false },
      global: {
        plugins: [pinia, router, i18n, [VueQueryPlugin, { queryClient }]],
        stubs: {
          AdminTopNavigation: true,
          GlobalSearch: true,
          LanguageToggleButton: true,
        },
      },
    })
    expect(header.get('a[href="/dashboard"]').attributes('translate')).toBe('no')

    const layout = mount(ConfigurableAdminLayout, {
      global: {
        plugins: [pinia, router, i18n],
        stubs: {
          // AI modified: this boundary test preserves slots without recreating App's Tooltip provider.
          Tooltip: { template: '<slot />' },
          TooltipContent: true,
          TooltipTrigger: { template: '<slot />' },
          AdminContextBar: true,
          AdminFooter: true,
          AdminHeader: true,
          AdminNavigation: true,
          AdminRouteOutlet: true,
          AdminWatermark: true,
          AppearancePanel: true,
        },
      },
    })
    expect(
      layout
        .get('[data-layout-region="primary-navigation"] a[href="/dashboard"]')
        .attributes('translate'),
    ).toBe('no')

    const defaultWatermark = mount(AdminWatermark, { global: { plugins: [i18n] } })
    expect(defaultWatermark.attributes('translate')).toBe('no')

    const customWatermark = mount(AdminWatermark, {
      props: { text: 'Internal review copy' },
      global: { plugins: [i18n] },
    })
    expect(customWatermark.attributes('translate')).toBeUndefined()
  })

  it('preserves authentication and configuration identifiers without marking prose fields', async () => {
    const captcha = mount(CaptchaField, {
      props: { challenge: '2 + 3 = ?' },
      global: { plugins: [i18n] },
    })
    expect(captcha.get('span[translate="no"]').text()).toBe('2 + 3 = ?')

    const router = createTestRouter()
    await router.push('/reset-password')
    await router.isReady()
    const resetPassword = mount(ResetPasswordPage, {
      global: { plugins: [createPinia(), router, i18n] },
    })
    expect(resetPassword.get('input[name="token"]').attributes('translate')).toBe('no')
    expect(resetPassword.get('h1').attributes('translate')).toBeUndefined()
    for (const visibilityButton of resetPassword.findAll('button[aria-controls]')) {
      expect(visibilityButton.attributes('title')).toBe(visibilityButton.attributes('aria-label'))
    }

    const parameterForm = mount(SystemParameterFormDialog, {
      attachTo: document.body,
      props: { open: true, isSaving: false },
      global: { plugins: [i18n] },
    })
    await flushPromises()

    const keyInput = document.body.querySelector<HTMLInputElement>('input[name="key"]')
    const parameterValue
      = document.body.querySelector<HTMLTextAreaElement>('textarea[name="value"]')
    const parameterDescription = document.body.querySelector<HTMLTextAreaElement>(
      'textarea[name="description"]',
    )
    expect(keyInput?.getAttribute('translate')).toBe('no')
    expect(parameterValue?.getAttribute('translate')).toBe('no')
    expect(parameterDescription?.hasAttribute('translate')).toBe(false)
    parameterForm.unmount()
  })
})
