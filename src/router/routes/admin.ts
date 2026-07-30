import type { RouteRecordRaw } from 'vue-router'
import '@/router/types'

const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'admin-root',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'admin-index',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/pages/admin/DashboardPage.vue'),
        meta: {
          titleKey: 'nav.dashboard',
          requiresAuth: true,
          requiredAbility: ['read', 'Dashboard'],
          breadcrumb: [{ labelKey: 'nav.dashboard' }],
          keepAlive: true,
          cacheKey: 'DashboardPage',
          tab: true,
          affix: true,
        },
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/pages/account/ProfilePage.vue'),
        meta: {
          titleKey: 'nav.profile',
          requiresAuth: true,
          breadcrumb: [{ labelKey: 'nav.profile' }],
          hidden: true,
          tab: true,
          cacheKey: 'ProfilePage',
        },
      },
      {
        path: 'change-password',
        name: 'change-password',
        component: () => import('@/pages/account/ChangePasswordPage.vue'),
        meta: {
          titleKey: 'account.changePasswordTitle',
          requiresAuth: true,
          breadcrumb: [
            { labelKey: 'nav.profile', to: '/profile' },
            { labelKey: 'account.changePasswordTitle' },
          ],
          hidden: true,
          tab: true,
          cacheKey: 'ChangePasswordPage',
        },
      },
      // AI modified: focused catalog routes are static and allow-listed while the component-center menu remains backend-driven.
      {
        path: 'components/table',
        name: 'component-table',
        component: () => import('@/pages/admin/components/TableExamplesPage.vue'),
        meta: {
          titleKey: 'components.center.modules.tables.title',
          requiresAuth: true,
          requiredAbility: ['read', 'Dashboard'],
          breadcrumb: [
            { labelKey: 'nav.components', to: '/components' },
            { labelKey: 'components.center.modules.tables.title' },
          ],
          hidden: true,
          keepAlive: true,
          cacheKey: 'TableExamplesPage',
          tab: true,
        },
      },
      {
        path: 'components/form',
        name: 'component-form',
        component: () => import('@/features/component-gallery/forms/FormExamplesPage.vue'),
        meta: {
          titleKey: 'components.center.modules.forms.title',
          requiresAuth: true,
          requiredAbility: ['read', 'Dashboard'],
          breadcrumb: [
            { labelKey: 'nav.components', to: '/components' },
            { labelKey: 'components.center.modules.forms.title' },
          ],
          hidden: true,
          keepAlive: true,
          cacheKey: 'FormExamplesPage',
          tab: true,
        },
      },
      {
        path: 'components/upload-drag',
        name: 'component-upload-drag',
        component: () =>
          import('@/features/component-gallery/operations/UploadDragExamplesPage.vue'),
        meta: {
          titleKey: 'components.center.modules.uploads.title',
          requiresAuth: true,
          requiredAbility: ['read', 'Dashboard'],
          breadcrumb: [
            { labelKey: 'nav.components', to: '/components' },
            { labelKey: 'components.center.modules.uploads.title' },
          ],
          hidden: true,
          tab: true,
        },
      },
      {
        path: 'components/selection',
        name: 'component-selection',
        // AI modified: filters and selectors need live dependency, race, recovery, and URL examples beyond catalog metadata.
        component: () => import('@/features/component-gallery/selection/SelectionExamplesPage.vue'),
        meta: {
          titleKey: 'components.center.modules.selection.title',
          requiresAuth: true,
          requiredAbility: ['read', 'Dashboard'],
          breadcrumb: [
            { labelKey: 'nav.components', to: '/components' },
            { labelKey: 'components.center.modules.selection.title' },
          ],
          hidden: true,
          keepAlive: true,
          cacheKey: 'SelectionExamplesPage',
          tab: true,
        },
      },
      {
        path: 'components/editors',
        name: 'component-editors',
        // AI modified: editor behaviors need live security/state examples beyond catalog metadata.
        component: () => import('@/features/component-gallery/editors/EditorExamplesPage.vue'),
        meta: {
          titleKey: 'components.center.modules.editors.title',
          requiresAuth: true,
          requiredAbility: ['read', 'Dashboard'],
          breadcrumb: [
            { labelKey: 'nav.components', to: '/components' },
            { labelKey: 'components.center.modules.editors.title' },
          ],
          hidden: true,
          keepAlive: true,
          cacheKey: 'EditorExamplesPage',
          tab: true,
        },
      },
      {
        path: 'components/icons',
        name: 'component-icons',
        // AI modified: icon safety, fallback, and copy interactions need a dedicated live route rather than metadata-only cards.
        component: () => import('@/features/component-gallery/icons/IconExamplesPage.vue'),
        meta: {
          titleKey: 'components.center.modules.icons.title',
          requiresAuth: true,
          requiredAbility: ['read', 'Dashboard'],
          breadcrumb: [
            { labelKey: 'nav.components', to: '/components' },
            { labelKey: 'components.center.modules.icons.title' },
          ],
          hidden: true,
          keepAlive: true,
          cacheKey: 'IconExamplesPage',
          tab: true,
        },
      },
      {
        path: 'components/primitives',
        name: 'component-primitives',
        // AI modified: primitives need live composition and gap decisions beyond generic catalog metadata.
        component: () =>
          import('@/features/component-gallery/primitives/PrimitiveExamplesPage.vue'),
        meta: {
          titleKey: 'components.center.modules.primitives.title',
          requiresAuth: true,
          requiredAbility: ['read', 'Dashboard'],
          breadcrumb: [
            { labelKey: 'nav.components', to: '/components' },
            { labelKey: 'components.center.modules.primitives.title' },
          ],
          hidden: true,
          tab: true,
        },
      },
      {
        path: 'components/patterns',
        name: 'component-patterns',
        component: () => import('@/pages/admin/components/ComponentCatalogModulePage.vue'),
        props: { moduleId: 'patterns' },
        meta: {
          titleKey: 'components.center.modules.patterns.title',
          requiresAuth: true,
          requiredAbility: ['read', 'Dashboard'],
          breadcrumb: [
            { labelKey: 'nav.components', to: '/components' },
            { labelKey: 'components.center.modules.patterns.title' },
          ],
          hidden: true,
          tab: true,
        },
      },
      {
        path: 'system-config/parameters',
        name: 'system-parameters',
        component: () => import('@/pages/admin/SystemParametersPage.vue'),
        meta: {
          titleKey: 'nav.systemParameters',
          requiresAuth: true,
          requiredAbility: ['read', 'Settings'],
          breadcrumb: [
            { labelKey: 'nav.systemConfig', to: '/system-config' },
            { labelKey: 'nav.systemParameters' },
          ],
          keepAlive: true,
          cacheKey: 'SystemParametersPage',
          tab: true,
        },
      },
      {
        path: 'forbidden',
        name: 'forbidden',
        component: () => import('@/pages/errors/ForbiddenPage.vue'),
        meta: {
          titleKey: 'errors.forbiddenTitle',
          requiresAuth: true,
          tab: false,
        },
      },
      {
        path: ':pathMatch(.*)*',
        name: 'admin-not-found',
        component: () => import('@/pages/errors/NotFoundPage.vue'),
        // AI modified: the authenticated shell already owns the page's main landmark.
        props: { isNested: true },
        meta: {
          titleKey: 'errors.notFoundTitle',
          requiresAuth: true,
          tab: false,
        },
      },
    ],
  },
]

export default adminRoutes
