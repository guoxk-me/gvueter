import type { AdminUser } from '@/features/users/types'
import type { CaptchaChallenge } from '@/types/auth'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createMemoryHistory, createRouter } from 'vue-router'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  getPostAuthenticationPath,
  getSafeSsoAuthorizationUrl,
} from '@/features/account/auth-redirect'
import CaptchaField from '@/features/account/components/CaptchaField.vue'
import PasswordChangeForm from '@/features/account/components/PasswordChangeForm.vue'
import ProfileForm from '@/features/account/components/ProfileForm.vue'
import { getPasswordStrength } from '@/features/account/password-strength'
import { i18n, setLocale } from '@/i18n'
import { ApiError } from '@/lib/http'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage.vue'
import LoginPage from '@/pages/auth/LoginPage.vue'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage.vue'
import SsoCallbackPage from '@/pages/auth/SsoCallbackPage.vue'
import { useAuthStore } from '@/stores/auth'

enableAutoUnmount(afterEach)

const firstCaptcha: CaptchaChallenge = {
  captchaId: 'captcha-first',
  challenge: '2 + 3 = ?',
  expiresAt: Date.now() + 60_000,
}

const secondCaptcha: CaptchaChallenge = {
  captchaId: 'captcha-second',
  challenge: '4 + 5 = ?',
  expiresAt: Date.now() + 60_000,
}

const adminUser: AdminUser = {
  id: 1,
  name: 'Admin User',
  email: 'admin@example.com',
  role: 'admin',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
}

async function mountLoginPage(redirect?: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: { template: '<div />' } },
      { path: '/dashboard', name: 'dashboard', component: { template: '<div />' } },
      { path: '/forgot-password', name: 'forgot-password', component: { template: '<div />' } },
      { path: '/reset-password', name: 'reset-password', component: { template: '<div />' } },
    ],
  })
  await router.push(redirect ? { path: '/login', query: { redirect } } : '/login')
  await router.isReady()

  const render = () =>
    mount(
      {
        components: { LoginPage, TooltipProvider },
        template: '<TooltipProvider><LoginPage /></TooltipProvider>',
      },
      {
        attachTo: document.body,
        global: {
          plugins: [pinia, i18n, router],
        },
      },
    )

  return { auth, render, router }
}

async function mountSsoCallbackPage(fragment: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: { template: '<div />' } },
      { path: '/dashboard', name: 'dashboard', component: { template: '<div />' } },
      { path: '/sso/callback', name: 'sso-callback', component: { template: '<div />' } },
    ],
  })
  await router.push(`/sso/callback${fragment}`)
  await router.isReady()
  const render = () =>
    mount(SsoCallbackPage, {
      attachTo: document.body,
      global: { plugins: [pinia, i18n, router] },
    })

  return { auth, render, router }
}

describe('authentication account UI', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    setLocale('en-US')
  })

  it('keeps the captcha model controlled and emits refresh', async () => {
    const wrapper = mount(CaptchaField, {
      attrs: { 'aria-describedby': 'captcha-help' },
      props: {
        challenge: firstCaptcha.challenge,
        modelValue: '',
      },
      global: { plugins: [i18n] },
    })

    await wrapper.get('input').setValue('5')
    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['5'])
    expect(wrapper.emitted('refresh')).toHaveLength(1)

    const challengeStatus = wrapper.get('[role="status"]')
    const describedBy = wrapper.get('input').attributes('aria-describedby')?.split(/\s+/) ?? []
    expect(describedBy).toContain('captcha-help')
    expect(describedBy).toContain(challengeStatus.attributes('id'))
    expect(challengeStatus.text()).toContain(firstCaptcha.challenge)

    await wrapper.setProps({ challenge: secondCaptcha.challenge })
    expect(challengeStatus.text()).toContain(secondCaptcha.challenge)
  })

  it('rejects encoded external redirect syntax at the shared password and SSO boundary', () => {
    expect(getPostAuthenticationPath('/users?status=active#table')).toBe(
      '/users?status=active#table',
    )
    for (const unsafeRedirect of [
      'https://evil.example',
      '//evil.example',
      '/%2F/evil.example',
      '/%252F%252Fevil.example',
      '/%5Cevil.example',
      '/users%0d%0aLocation:%20https://evil.example',
    ]) {
      expect(getPostAuthenticationPath(unsafeRedirect)).toBe('/dashboard')
    }
    expect(getSafeSsoAuthorizationUrl('/sso/callback#ticket=opaque')).toBe(
      `${window.location.origin}/sso/callback#ticket=opaque`,
    )
    expect(getSafeSsoAuthorizationUrl('https://login.example.com/authorize')).toBe(
      'https://login.example.com/authorize',
    )
    expect(getSafeSsoAuthorizationUrl('http://login.example.com/authorize')).toBeNull()
    expect(
      getSafeSsoAuthorizationUrl('https://client-secret@login.example.com/authorize'),
    ).toBeNull()
  })

  it('loads a challenge, requires its answer, and submits it through login options', async () => {
    const { auth, render, router } = await mountLoginPage()
    const getCaptcha = vi.spyOn(auth, 'getCaptcha').mockResolvedValue(firstCaptcha)
    const login = vi.spyOn(auth, 'login').mockResolvedValue(true)
    const wrapper = render()
    await flushPromises()

    expect(getCaptcha).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain(firstCaptcha.challenge)

    await wrapper.get('input[type="email"]').setValue('admin@example.com')
    await wrapper.get('input[type="password"]').setValue('admin123')
    wrapper.get<HTMLFormElement>('form').element.requestSubmit()
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Enter the verification answer')
    })

    expect(login).not.toHaveBeenCalled()
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(wrapper.get('input[inputmode="numeric"]').element),
    )

    await wrapper.get('input[inputmode="numeric"]').setValue('5')
    wrapper.get<HTMLFormElement>('form').element.requestSubmit()
    await vi.waitFor(() => {
      expect(login).toHaveBeenCalledOnce()
    })

    expect(login).toHaveBeenCalledWith('admin@example.com', 'admin123', {
      captchaId: firstCaptcha.captchaId,
      captchaCode: '5',
      provider: 'password',
    })
    expect(router.currentRoute.value.path).toBe('/dashboard')
  })

  it('starts SSO through the backend with the same safe post-authentication target', async () => {
    const { auth, render } = await mountLoginPage('/users?status=active')
    vi.spyOn(auth, 'getCaptcha').mockResolvedValue(firstCaptcha)
    vi.spyOn(auth, 'getSsoConfiguration').mockResolvedValue({
      isEnabled: true,
      providerName: 'Operations SSO',
    })
    const startSsoLogin = vi
      .spyOn(auth, 'startSsoLogin')
      .mockImplementation(() => new Promise(() => undefined))
    const wrapper = render()
    await flushPromises()

    const ssoButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Continue with Operations SSO'))
    if (!ssoButton) throw new Error('SSO start button was not rendered')
    expect(ssoButton.attributes('type')).toBe('button')
    await ssoButton.trigger('click')
    expect(startSsoLogin).toHaveBeenCalledWith('/users?status=active')
    expect(ssoButton.text()).toContain('Redirecting to SSO')
  })

  it('falls back to the dashboard for a protocol-relative post-login redirect', async () => {
    const { auth, render, router } = await mountLoginPage('//evil.test')
    vi.spyOn(auth, 'getCaptcha').mockResolvedValue(firstCaptcha)
    vi.spyOn(auth, 'login').mockResolvedValue(true)
    const wrapper = render()
    await flushPromises()

    await wrapper.get('input[type="email"]').setValue('admin@example.com')
    await wrapper.get('input[type="password"]').setValue('admin123')
    await wrapper.get('input[inputmode="numeric"]').setValue('5')
    wrapper.get<HTMLFormElement>('form').element.requestSubmit()
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/dashboard'))

    expect(router.currentRoute.value.fullPath).toBe('/dashboard')
  })

  it('keeps password login usable and offers recovery when SSO discovery fails', async () => {
    const { auth, render } = await mountLoginPage()
    vi.spyOn(auth, 'getCaptcha').mockResolvedValue(firstCaptcha)
    vi.spyOn(auth, 'getSsoConfiguration')
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValueOnce({ isEnabled: true, providerName: 'Recovered SSO' })
    const wrapper = render()
    await flushPromises()

    expect(wrapper.get('input[type="email"]').attributes('disabled')).toBeUndefined()
    const retryButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Retry SSO availability'))
    if (!retryButton) throw new Error('SSO retry button was not rendered')
    expect(retryButton.text()).toContain('Retry SSO availability')
    await retryButton.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Continue with Recovered SSO')
  })

  it('clears the callback fragment before exchanging and follows the approved redirect', async () => {
    const secretTicket = 'mock-sso-ticket-secret-value'
    const { auth, render, router } = await mountSsoCallbackPage(`#ticket=${secretTicket}`)
    const exchange = vi.spyOn(auth, 'exchangeSsoTicket').mockImplementation(async (ticket) => {
      expect(ticket).toBe(secretTicket)
      expect(router.currentRoute.value.hash).toBe('')
      return '/dashboard'
    })
    const wrapper = render()

    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/dashboard'))
    expect(exchange).toHaveBeenCalledOnce()
    expect(wrapper.text()).not.toContain(secretTicket)
  })

  it('rejects ambiguous callback fragments without exposing or exchanging them', async () => {
    const { auth, render, router } = await mountSsoCallbackPage(
      '#ticket=first-secret&ticket=second-secret',
    )
    const exchange = vi.spyOn(auth, 'exchangeSsoTicket')
    const wrapper = render()
    await flushPromises()

    expect(router.currentRoute.value).toMatchObject({ name: 'sso-callback', hash: '' })
    expect(exchange).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain(
      'This SSO request is invalid, expired, or has already been used.',
    )
    expect(wrapper.text()).not.toContain('first-secret')
    expect(wrapper.text()).not.toContain('second-secret')
    await vi.waitFor(() => expect(document.activeElement).toBe(wrapper.get('h1').element))
  })

  it('refreshes and clears the consumed captcha after a failed login', async () => {
    const { auth, render } = await mountLoginPage()
    const getCaptcha = vi
      .spyOn(auth, 'getCaptcha')
      .mockResolvedValueOnce(firstCaptcha)
      .mockResolvedValueOnce(secondCaptcha)
    vi.spyOn(auth, 'login').mockRejectedValue(
      new ApiError('INVALID_CREDENTIALS', 'Email or password is incorrect', 401),
    )
    const wrapper = render()
    await flushPromises()

    await wrapper.get('input[type="email"]').setValue('admin@example.com')
    await wrapper.get('input[type="password"]').setValue('invalid-password')
    await wrapper.get('input[inputmode="numeric"]').setValue('5')
    wrapper.get<HTMLFormElement>('form').element.requestSubmit()
    await vi.waitFor(() => {
      expect(getCaptcha).toHaveBeenCalledTimes(2)
    })

    expect(wrapper.text()).toContain(secondCaptcha.challenge)
    expect(wrapper.get<HTMLInputElement>('input[inputmode="numeric"]').element.value).toBe('')
    // AI modified: UI feedback no longer identifies whether the account exists.
    expect(wrapper.text()).toContain('Email or password is incorrect')
  })

  it('locks the login form after five consecutive failures', async () => {
    const { auth, render } = await mountLoginPage()
    let captchaSequence = 0
    const getCaptcha = vi.spyOn(auth, 'getCaptcha').mockImplementation(async () => ({
      ...firstCaptcha,
      captchaId: `captcha-${++captchaSequence}`,
    }))
    const login = vi
      .spyOn(auth, 'login')
      .mockRejectedValue(new ApiError('INVALID_CREDENTIALS', 'Email or password is incorrect', 401))
    const wrapper = render()
    await flushPromises()

    await wrapper.get('input[type="email"]').setValue('admin@example.com')
    await wrapper.get('input[type="password"]').setValue('invalid-password')

    for (let failedAttempt = 1; failedAttempt <= 5; failedAttempt += 1) {
      await wrapper.get('input[inputmode="numeric"]').setValue('5')
      wrapper.get<HTMLFormElement>('form').element.requestSubmit()
      await vi.waitFor(() => {
        expect(login).toHaveBeenCalledTimes(failedAttempt)
        expect(getCaptcha).toHaveBeenCalledTimes(failedAttempt + 1)
      })
    }

    const submitButton = wrapper.get<HTMLButtonElement>('button[type="submit"]')
    expect(submitButton.attributes('disabled')).toBeDefined()
    expect(submitButton.text()).toContain('Please wait 30s')
  })

  it('does not consume credential attempts when the server is unavailable', async () => {
    const { auth, render } = await mountLoginPage()
    vi.spyOn(auth, 'getCaptcha')
      .mockResolvedValueOnce(firstCaptcha)
      .mockResolvedValueOnce(secondCaptcha)
    vi.spyOn(auth, 'login').mockRejectedValue(
      new ApiError('SERVICE_UNAVAILABLE', 'Service is temporarily unavailable', 503),
    )
    const wrapper = render()
    await flushPromises()

    await wrapper.get('input[type="email"]').setValue('admin@example.com')
    await wrapper.get('input[type="password"]').setValue('admin123')
    await wrapper.get('input[inputmode="numeric"]').setValue('5')
    wrapper.get<HTMLFormElement>('form').element.requestSubmit()
    await vi.waitFor(() => expect(wrapper.text()).toContain(secondCaptcha.challenge))

    // AI modified: operational outages remain visible without advancing the lockout counter.
    expect(wrapper.text()).not.toContain('Failed 1 time(s)')
    expect(
      wrapper.get<HTMLButtonElement>('button[type="submit"]').attributes('disabled'),
    ).toBeUndefined()
  })

  it('emits a validated and trimmed profile update', async () => {
    const wrapper = mount(ProfileForm, {
      attachTo: document.body,
      props: { user: adminUser },
      global: { plugins: [createPinia(), i18n] },
    })
    const fields = wrapper.findAll('input')

    await fields[0]!.setValue('  Platform Admin  ')
    await fields[1]!.setValue('  platform@example.com  ')
    wrapper.get<HTMLFormElement>('form').element.requestSubmit()
    await vi.waitFor(() => {
      expect(wrapper.emitted('submit')).toHaveLength(1)
    })

    expect(wrapper.emitted('submit')?.[0]).toEqual([
      {
        name: 'Platform Admin',
        email: 'platform@example.com',
      },
    ])
  })

  it('focuses the first invalid profile field after submission', async () => {
    const wrapper = mount(ProfileForm, {
      attachTo: document.body,
      props: { user: adminUser },
      global: { plugins: [createPinia(), i18n] },
    })
    const nameInput = wrapper.get<HTMLInputElement>('input[autocomplete="name"]')
    await nameInput.setValue('A')

    wrapper.get<HTMLFormElement>('form').element.requestSubmit()
    await vi.waitFor(() => expect(nameInput.attributes('aria-invalid')).toBe('true'))

    await vi.waitFor(() => expect(document.activeElement).toBe(nameInput.element))
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('rejects weak or mismatched passwords before emitting a valid change', async () => {
    const wrapper = mount(PasswordChangeForm, {
      attachTo: document.body,
      global: { plugins: [createPinia(), i18n] },
    })
    const fields = wrapper.findAll('input[type="password"]')

    await fields[0]!.setValue('Current123')
    await fields[1]!.setValue('weak')
    await fields[2]!.setValue('different')
    wrapper.get<HTMLFormElement>('form').element.requestSubmit()
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Password must be at least 8 characters')
    })

    expect(wrapper.emitted('submit')).toBeUndefined()
    await vi.waitFor(() => expect(document.activeElement).toBe(fields[1]!.element))

    await fields[1]!.setValue('NewPassword1')
    await fields[2]!.setValue('NewPassword1')
    expect(wrapper.text()).toContain('Password strength: Strong')
    wrapper.get<HTMLFormElement>('form').element.requestSubmit()
    await vi.waitFor(() => {
      expect(wrapper.emitted('submit')).toHaveLength(1)
    })

    expect(wrapper.emitted('submit')?.[0]).toEqual([
      {
        currentPassword: 'Current123',
        newPassword: 'NewPassword1',
        confirmPassword: 'NewPassword1',
      },
    ])
  })

  it('scores the shared backend password contract deterministically', () => {
    expect(getPasswordStrength('weak')).toEqual({ score: 1, isStrong: false })
    expect(getPasswordStrength('StrongPass1')).toEqual({ score: 4, isStrong: true })
  })

  it('focuses forgot-password success feedback and exposes real login links', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore(pinia)
    vi.spyOn(auth, 'forgotPassword').mockResolvedValue(undefined)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/login', name: 'login', component: { template: '<div />' } },
        { path: '/forgot-password', name: 'forgot-password', component: ForgotPasswordPage },
      ],
    })
    await router.push('/forgot-password')
    await router.isReady()
    const wrapper = mount(ForgotPasswordPage, {
      attachTo: document.body,
      global: { plugins: [pinia, i18n, router] },
    })

    await wrapper.get('input[type="email"]').setValue('admin@example.com')
    wrapper.get<HTMLFormElement>('form').element.requestSubmit()
    await vi.waitFor(() => expect(wrapper.find('h2[tabindex="-1"]').exists()).toBe(true))

    await vi.waitFor(() => expect(document.activeElement).toBe(wrapper.get('h2').element))
    expect(wrapper.get('a').attributes('href')).toBe('/login')
  })

  it('focuses reset-password success feedback and exposes a real login link', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const auth = useAuthStore(pinia)
    vi.spyOn(auth, 'resetPassword').mockResolvedValue(undefined)
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/login', name: 'login', component: { template: '<div />' } },
        { path: '/reset-password', name: 'reset-password', component: ResetPasswordPage },
      ],
    })
    await router.push('/reset-password')
    await router.isReady()
    const wrapper = mount(ResetPasswordPage, {
      attachTo: document.body,
      global: { plugins: [pinia, i18n, router] },
    })
    const fields = wrapper.findAll('input')

    await fields[0]!.setValue('reset-token')
    await fields[1]!.setValue('NewPassword1')
    await fields[2]!.setValue('NewPassword1')
    wrapper.get<HTMLFormElement>('form').element.requestSubmit()
    await vi.waitFor(() => expect(wrapper.find('h2[tabindex="-1"]').exists()).toBe(true))

    await vi.waitFor(() => expect(document.activeElement).toBe(wrapper.get('h2').element))
    expect(wrapper.get('a').attributes('href')).toBe('/login')
  })
})
