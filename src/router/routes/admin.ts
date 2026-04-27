import type { RouteRecordRaw } from 'vue-router'
import '@/router/types'

const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/pages/admin/DashboardPage.vue'),
        meta: {
          title: '仪表盘',
          requiresAuth: true,
          requiredAbility: ['read', 'Dashboard'],
          breadcrumb: [{ label: '仪表盘' }],
        },
      },
    ],
  },
]

export default adminRoutes
