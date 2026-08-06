import type { RouteRecordRaw } from 'vue-router'

const authRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        redirect: '/login',
      },
      {
        path: 'login',
        name: 'login',
        component: () => import('@/pages/auth/LoginPage.vue'),
        meta: { requiresGuest: true, titleKey: 'auth.login' },
      },
      {
        path: 'forgot-password',
        name: 'forgot-password',
        component: () => import('@/pages/auth/ForgotPasswordPage.vue'),
        meta: { requiresGuest: true, titleKey: 'auth.forgotPasswordTitle' },
      },
      {
        path: 'reset-password/:token?',
        name: 'reset-password',
        component: () => import('@/pages/auth/ResetPasswordPage.vue'),
        meta: { requiresGuest: true, titleKey: 'auth.resetPasswordTitle' },
      },
      {
        path: 'sso/callback',
        name: 'sso-callback',
        component: () => import('@/pages/auth/SsoCallbackPage.vue'),
        // AI modified: the callback clears its fragment before deciding whether an existing session wins.
        meta: { titleKey: 'auth.ssoCallbackTitle' },
      },
    ],
  },
]

export default authRoutes
