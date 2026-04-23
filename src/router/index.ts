import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { appAbility } from '@/lib/ability'
import authRoutes from './routes/auth'
import adminRoutes from './routes/admin'
import './types'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...authRoutes,
    ...adminRoutes,
    // 404 fallback
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to, _from) => {
  const auth = useAuthStore()

  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  const requiresGuest = to.matched.some((r) => r.meta.requiresGuest)

  if (requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (requiresGuest && auth.isAuthenticated) {
    return { path: '/dashboard' }
  }

  // Check CASL ability for the most-specific matched route that declares one
  const routeWithAbility = [...to.matched].reverse().find((r) => r.meta.requiredAbility)
  if (routeWithAbility) {
    const [action, subject] = routeWithAbility.meta.requiredAbility!
    if (!appAbility.can(action, subject)) {
      // Authenticated but forbidden — redirect to dashboard (or login if not authed)
      return auth.isAuthenticated
        ? { path: '/dashboard' }
        : { name: 'login', query: { redirect: to.fullPath } }
    }
  }
})

export default router
