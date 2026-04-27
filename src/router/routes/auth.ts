import type { RouteRecordRaw } from 'vue-router'

const authRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/auth/LoginPage.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/pages/auth/ForgotPasswordPage.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/reset-password/:token',
    name: 'reset-password',
    component: () => import('@/pages/auth/ResetPasswordPage.vue'),
    meta: { requiresGuest: true },
  },
]

export default authRoutes
