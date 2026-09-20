import type { ApiResponse } from '@/lib/http'
import { http, HttpResponse } from 'msw'
import NProgress from 'nprogress'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { startAppLocaleSync } from '@/composables/useLocaleToggle'
import { setLocale } from '@/i18n'
import {
  applicationFailure,
  clearApplicationFailure,
  installApplicationPreloadRecovery,
} from '@/lib/application-recovery'
import { registerFrontendErrorReporter } from '@/lib/observability'
import {
  notifyForbidden,
  notifySessionInvalidated,
  resetSessionInvalidation,
} from '@/lib/request-policy'
import { generateMockToken } from '@/mocks/data/users'
import { server } from '@/mocks/node'
import {
  getAnchorScrollTarget,
  setupDocumentTitle,
  setupNavigationAccessGuard,
  setupNavigationProgress,
  setupRequestAccessHandlers,
} from '@/router'
import { useAppearanceStore } from '@/stores/appearance'
import { AUTH_TOKEN_STORAGE_KEY } from '@/stores/auth'

const TestPage = { template: '<div />' }

function createHandlerTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/login',
        name: 'login',
        component: TestPage,
        meta: { requiresGuest: true, title: '登录' },
      },
      {
        path: '/dashboard',
        name: 'dashboard',
        component: TestPage,
        meta: { requiresAuth: true, titleKey: 'nav.dashboard' },
      },
    ],
  })
}

beforeEach(() => {
  resetSessionInvalidation()
  clearApplicationFailure()
  setLocale('zh-CN')
})

describe('router fatal navigation recovery', () => {
  it('keeps the stable route and reports one failed lazy navigation', async () => {
    const chunkFailure = new Error('Lazy route failed')
    const testRouter = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/stable', name: 'stable', component: TestPage },
        {
          path: '/broken',
          name: 'broken',
          component: () => Promise.reject(chunkFailure),
        },
      ],
    })
    const done = vi.spyOn(NProgress, 'done')
    const report = vi.fn()
    const unregisterReporter = registerFrontendErrorReporter('router-recovery-spec', { report })
    setupNavigationProgress(testRouter)
    setupNavigationProgress(testRouter)
    await testRouter.push('/stable')

    try {
      await expect(testRouter.push('/broken')).rejects.toThrow('Lazy route failed')

      expect(testRouter.currentRoute.value.name).toBe('stable')
      expect(applicationFailure.value).toMatchObject({
        kind: 'navigation',
        routeName: 'broken',
      })
      expect(report).toHaveBeenCalledOnce()
      expect(report).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'navigation', message: 'Lazy route failed' }),
      )
      expect(done).toHaveBeenCalledWith(true)
    }
    finally {
      done.mockRestore()
      unregisterReporter()
    }
  })

  it('does not report the router follow-up twice after a Vite preload failure', async () => {
    const chunkFailure = new Error('Stale route chunk')
    const testRouter = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/stable', name: 'stable', component: TestPage },
        {
          path: '/broken',
          name: 'broken',
          component: () => Promise.reject(chunkFailure),
        },
      ],
    })
    const report = vi.fn()
    const unregisterReporter = registerFrontendErrorReporter('router-preload-spec', { report })
    const uninstallPreloadRecovery = installApplicationPreloadRecovery()
    setupNavigationProgress(testRouter)
    await testRouter.push('/stable')

    try {
      window.dispatchEvent(
        Object.assign(new Event('vite:preloadError', { cancelable: true }), {
          payload: chunkFailure,
        }) as VitePreloadErrorEvent,
      )
      await expect(testRouter.push('/broken')).rejects.toThrow('Stale route chunk')

      expect(applicationFailure.value).toMatchObject({
        kind: 'asset-preload',
        routeName: 'broken',
      })
      expect(report).toHaveBeenCalledOnce()
      expect(report).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'vite-preload', message: 'Stale route chunk' }),
      )
    }
    finally {
      uninstallPreloadRecovery()
      unregisterReporter()
    }
  })
})

describe('router hash scrolling', () => {
  it.each(['#admin-main-content', '#table_2', '#section9'])(
    'accepts the anchor selector %s',
    (hash) => {
      expect(getAnchorScrollTarget(hash)).toBe(hash)
    },
  )

  it.each(['', '#ticket=opaque', '#error=access_denied', '#two words', '#123-start'])(
    'does not treat the data fragment %s as a selector',
    (hash) => {
      // AI modified: SSO fragments must be consumed by the callback page without router selector warnings.
      expect(getAnchorScrollTarget(hash)).toBeUndefined()
    },
  )
})

describe('session restore navigation recovery', () => {
  it('keeps login reachable and preserves a retryable token during a transient identity outage', async () => {
    const savedToken = generateMockToken(1)
    sessionStorage.setItem(AUTH_TOKEN_STORAGE_KEY, savedToken)
    server.use(
      http.get('/api/auth/me', () =>
        HttpResponse.json<ApiResponse<null>>(
          { code: 'IDENTITY_UNAVAILABLE', message: 'Identity service unavailable', data: null },
          { status: 503 },
        )),
    )
    setActivePinia(createPinia())
    const testRouter = createHandlerTestRouter()
    setupNavigationAccessGuard(testRouter)

    await expect(testRouter.push('/dashboard')).resolves.toBeUndefined()

    expect(testRouter.currentRoute.value).toMatchObject({
      name: 'login',
      query: { redirect: '/dashboard' },
    })
    expect(sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe(savedToken)

    // AI modified: the same preserved session can finish restoration after the backend recovers.
    server.resetHandlers()
    await expect(testRouter.push('/dashboard')).resolves.toBeUndefined()
    expect(testRouter.currentRoute.value.name).toBe('dashboard')
  })
})

describe('router document title', () => {
  it('recomputes route and application titles immediately after locale changes', async () => {
    const testRouter = createHandlerTestRouter()
    setupDocumentTitle(testRouter)
    await testRouter.push('/login')

    expect(document.title).toBe('登录 - Gvueter')

    setActivePinia(createPinia())
    const appearance = useAppearanceStore()
    startAppLocaleSync(appearance)
    appearance.setLocale('en-US')
    expect(document.title).toBe('Login - Gvueter')
  })
})

describe('request access router handlers', () => {
  it('registers idempotently and preserves the current URL across a 401 redirect', async () => {
    const testRouter = createHandlerTestRouter()
    await testRouter.push('/dashboard?source=notification')
    setupRequestAccessHandlers(testRouter)
    setupRequestAccessHandlers(testRouter)

    await notifySessionInvalidated({
      status: 401,
      code: 'TOKEN_EXPIRED',
      message: 'Expired session',
    })

    expect(testRouter.currentRoute.value).toMatchObject({
      name: 'login',
      query: { redirect: '/dashboard?source=notification' },
    })
  })

  it('shows one localized toast for a forbidden response', async () => {
    const testRouter = createHandlerTestRouter()
    const errorToast = vi.spyOn(toast, 'error')
    setupRequestAccessHandlers(testRouter)
    setupRequestAccessHandlers(testRouter)

    await notifyForbidden({
      status: 403,
      code: 'FORBIDDEN',
      message: 'Write access is required',
    })

    expect(errorToast).toHaveBeenCalledOnce()
    expect(errorToast).toHaveBeenCalledWith('无权限访问', {
      description: 'Write access is required',
    })
    errorToast.mockRestore()
  })
})
