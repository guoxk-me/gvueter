import type { Composer } from 'vue-i18n'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'
import NProgress from 'nprogress'
import { watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { toast } from 'vue-sonner'
import { i18n } from '@/i18n'
import { appAbility } from '@/lib/ability'
import { reportApplicationFailure } from '@/lib/application-recovery'
import { registerForbiddenHandler, registerSessionInvalidationHandler } from '@/lib/request-policy'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'
import { useTabsStore } from '@/stores/tabs'
import adminRoutes from './routes/admin'
import authRoutes from './routes/auth'
import './types'
import '@/features/navigation/navigation-progress.css'

export function getAnchorScrollTarget(hash: string): string | undefined {
  // AI modified: OAuth-style fragments are data, not CSS selectors for scroll restoration.
  return /^#[a-z][\w-]*$/i.test(hash) ? hash : undefined
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // AI modified: hash destinations such as the notification center remain keyboard- and link-reachable.
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    const anchorScrollTarget = getAnchorScrollTarget(to.hash)
    if (anchorScrollTarget) {
      // AI modified: programmatic scrolling follows the same reduced-motion preference as CSS.
      const shouldReduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      return { el: anchorScrollTarget, behavior: shouldReduceMotion ? 'auto' : 'smooth' }
    }
    return to.path !== from.path ? { top: 0 } : false
  },
  routes: [
    ...authRoutes,
    ...adminRoutes,
    // 404 fallback
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/errors/NotFoundPage.vue'),
      meta: { titleKey: 'errors.notFoundTitle' },
    },
  ],
})

const progressRouters = new WeakSet<Router>()
const accessGuardRouters = new WeakSet<Router>()
const titleRouters = new WeakSet<Router>()
const requestPolicyRouters = new WeakSet<Router>()

const routeTitleKeys: Readonly<Record<string, string>> = {
  login: 'auth.login',
  'forgot-password': 'auth.forgotPasswordTitle',
  'reset-password': 'auth.resetPasswordTitle',
  'sso-callback': 'auth.ssoCallbackTitle',
}
const i18nComposer = i18n.global as unknown as Composer

export function getLocalizedRouteTitle(route: RouteLocationNormalizedLoaded): string | undefined {
  const routeName = typeof route.name === 'string' ? route.name : undefined
  const titleKey = route.meta.titleKey ?? (routeName ? routeTitleKeys[routeName] : undefined)
  return titleKey ? i18n.global.t(titleKey) : undefined
}

function updateDocumentTitle(route: RouteLocationNormalizedLoaded): void {
  if (typeof document === 'undefined') return

  const appTitle = i18n.global.t('common.appTitle')
  const pageTitle = getLocalizedRouteTitle(route)
  document.title = pageTitle ? `${pageTitle} - ${appTitle}` : appTitle
}

export function setupDocumentTitle(targetRouter: Router): void {
  if (titleRouters.has(targetRouter)) return

  targetRouter.afterEach((to) => updateDocumentTitle(to))
  // AI modified: locale changes retranslate the active route title without an extra navigation.
  watch(
    () => i18nComposer.locale.value,
    () => updateDocumentTitle(targetRouter.currentRoute.value),
    { flush: 'sync' },
  )
  updateDocumentTitle(targetRouter.currentRoute.value)
  titleRouters.add(targetRouter)
}

export function setupRequestAccessHandlers(targetRouter: Router): void {
  if (requestPolicyRouters.has(targetRouter)) return

  registerSessionInvalidationHandler('router-session-redirect', async () => {
    const currentRoute = targetRouter.currentRoute.value
    if (currentRoute.name === 'login') return

    // AI modified: the auth store owns session cleanup; this boundary only restores navigation intent.
    await targetRouter.replace({
      name: 'login',
      query: { redirect: currentRoute.fullPath },
    })
  })
  registerForbiddenHandler('router-forbidden-feedback', (failure) => {
    toast.error(i18n.global.t('errors.forbidden'), {
      description: failure.message,
    })
  })
  requestPolicyRouters.add(targetRouter)
}

export function setupNavigationProgress(targetRouter: Router): void {
  if (progressRouters.has(targetRouter)) return

  NProgress.configure({
    barSelector: '.bar',
    minimum: 0.12,
    showSpinner: false,
    trickleSpeed: 180,
    // AI modified: route titles/content own announcements; the visual bar must not expose NProgress' invalid role.
    template: '<div class="bar" aria-hidden="true"><div class="peg"></div></div>',
  })
  targetRouter.beforeEach((to, from) => {
    // AI modified: this progress bar tracks route navigation only; requests keep local Vue Query loading.
    if (to.fullPath !== from.fullPath) NProgress.start()
  })
  targetRouter.afterEach(() => NProgress.done())
  targetRouter.onError((failure, to) => {
    NProgress.done(true)
    // AI modified: failed guards and lazy routes enter one visible boundary with URL-safe diagnostics.
    reportApplicationFailure('navigation', failure, {
      routeName: typeof to.name === 'string' ? to.name : undefined,
    })
  })
  progressRouters.add(targetRouter)
}

export async function bootstrapAuthenticatedNavigation(targetRouter: Router): Promise<boolean> {
  const authStore = useAuthStore()
  if (!authStore.user || !authStore.principalId) return false

  const permissionStore = usePermissionStore()
  // AI modified: tenant identity participates in dynamic-menu ownership as well as the account role.
  return permissionStore.loadNavigation(
    targetRouter,
    `${authStore.principalId}:${authStore.user.role}`,
  )
}

export function setupNavigationAccessGuard(targetRouter: Router): void {
  if (accessGuardRouters.has(targetRouter)) return

  targetRouter.beforeEach(async (to) => {
    const authStore = useAuthStore()
    const permissionStore = usePermissionStore()
    const requiresAuth = to.matched.some((routeRecord) => routeRecord.meta.requiresAuth)
    const requiresGuest = to.matched.some((routeRecord) => routeRecord.meta.requiresGuest)
    try {
      await authStore.restoreSession()
    } catch {
      // AI modified: a transient identity outage must not turn public recovery routes into a blank page.
      if (requiresAuth) return { name: 'login', query: { redirect: to.fullPath } }
      return true
    }

    if (!authStore.isAuthenticated) {
      if (permissionStore.isReady || permissionStore.registeredRouteNames.length > 0)
        permissionStore.unloadNavigation()

      if (requiresAuth) return { name: 'login', query: { redirect: to.fullPath } }

      return true
    }

    if (requiresGuest) return { name: 'dashboard' }

    let hasNewRoutes = false
    try {
      hasNewRoutes = await bootstrapAuthenticatedNavigation(targetRouter)
    } catch {
      // A static route can still render when the optional backend navigation endpoint is unavailable.
    }

    if (permissionStore.isPathDenied(to.path) && to.name !== 'forbidden')
      return { name: 'forbidden', replace: true }

    const isFallbackRoute = to.name === 'admin-not-found' || to.name === 'not-found'
    if (hasNewRoutes && isFallbackRoute) {
      // AI modified: re-enter once after addRoute so a first direct dynamic URL is matched correctly.
      return { path: to.path, query: to.query, hash: to.hash, replace: true }
    }

    const routeWithAbility = [...to.matched]
      .reverse()
      .find((routeRecord) => routeRecord.meta.requiredAbility)
    if (routeWithAbility?.meta.requiredAbility) {
      const [action, subject] = routeWithAbility.meta.requiredAbility
      if (!appAbility.can(action, subject) && to.name !== 'forbidden')
        return { name: 'forbidden', replace: true }
    }

    return true
  })

  accessGuardRouters.add(targetRouter)
}

setupNavigationProgress(router)
setupNavigationAccessGuard(router)
setupDocumentTitle(router)
setupRequestAccessHandlers(router)

router.afterEach((to) => {
  const tabsStore = useTabsStore()
  tabsStore.openRouteTab(to)
})

export default router
