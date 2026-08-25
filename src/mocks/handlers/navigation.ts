import type { BackendMenuNode, BackendMenuResponse } from '@/features/navigation'
import type { ApiResponse } from '@/lib/http'
import { http, HttpResponse } from 'msw'
import { mockUsers, parseUserIdFromToken } from '@/mocks/data/users'
import { getManagedBackendMenus } from './menus'

const platformBackendMenus: BackendMenuNode[] = [
  {
    id: 'dashboard',
    kind: 'menu',
    titleKey: 'nav.dashboard',
    path: '/dashboard',
    routeName: 'dashboard',
    componentKey: 'dashboard',
    icon: 'dashboard',
    order: 10,
    keepAlive: true,
    cacheKey: 'DashboardPage',
    requiredAbility: { action: 'read', subject: 'Dashboard' },
  },
  {
    id: 'components',
    kind: 'menu',
    titleKey: 'nav.components',
    path: '/components',
    routeName: 'components',
    componentKey: 'components',
    icon: 'components',
    order: 20,
    keepAlive: true,
    cacheKey: 'ComponentsPage',
    requiredAbility: { action: 'read', subject: 'Dashboard' },
  },
  {
    id: 'message-center',
    kind: 'menu',
    titleKey: 'nav.messageCenter',
    path: '/message-center',
    routeName: 'message-center',
    componentKey: 'message-center',
    icon: 'message-center',
    order: 15,
    keepAlive: true,
    cacheKey: 'MessageCenterPage',
    requiredAbility: { action: 'read', subject: 'Dashboard' },
  },
  {
    id: 'profile',
    kind: 'menu',
    titleKey: 'nav.profile',
    path: '/profile',
    routeName: 'profile',
    componentKey: 'profile',
    icon: 'profile',
    hidden: true,
    order: 90,
    cacheKey: 'ProfilePage',
  },
  {
    id: 'change-password',
    kind: 'menu',
    titleKey: 'account.changePasswordTitle',
    path: '/change-password',
    routeName: 'change-password',
    componentKey: 'change-password',
    icon: 'password',
    hidden: true,
    order: 91,
    cacheKey: 'ChangePasswordPage',
  },
  {
    id: 'resources',
    kind: 'menu',
    titleKey: 'nav.resources',
    icon: 'external',
    order: 40,
    children: [
      {
        id: 'documentation',
        kind: 'external',
        titleKey: 'nav.documentation',
        // AI modified: the default fixture exercises a new browsing context without trusting a vendor origin.
        externalUrl: '/embedded-help.html',
        icon: 'external',
        order: 10,
        requiredAbility: { action: 'read', subject: 'Dashboard' },
      },
      {
        id: 'embedded-documentation',
        kind: 'iframe',
        titleKey: 'nav.embeddedDocumentation',
        path: '/embedded-documentation',
        routeName: 'embedded-documentation',
        componentKey: 'iframe',
        iframeUrl: '/embedded-help.html',
        icon: 'iframe',
        order: 20,
        cacheKey: 'IframePage',
        requiredAbility: { action: 'read', subject: 'Dashboard' },
      },
    ],
  },
]

export function getMockBackendMenus(): BackendMenuNode[] {
  return [...platformBackendMenus, ...getManagedBackendMenus()]
}

/** Initial snapshot retained for pure navigation resolver tests. */
export const mockBackendMenus = getMockBackendMenus()

export const navigationHandler = http.get<never, never, ApiResponse<BackendMenuResponse | null>>(
  '/api/navigation',
  ({ request }) => {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    const userId = token ? parseUserIdFromToken(token) : null
    const hasAuthenticatedUser
      = userId !== null && mockUsers.some(mockUser => mockUser.id === userId)

    if (!hasAuthenticatedUser) {
      return HttpResponse.json<ApiResponse<BackendMenuResponse | null>>(
        { code: 401, message: '登录状态无效，请重新登录', data: null },
        { status: 401 },
      )
    }

    // AI modified: the mock authenticates the menu request; frontend CASL filtering remains UX only.
    return HttpResponse.json<ApiResponse<BackendMenuResponse | null>>({
      code: 0,
      message: 'success',
      data: { menus: getMockBackendMenus() },
    })
  },
)

export const navigationHandlers = [navigationHandler]
