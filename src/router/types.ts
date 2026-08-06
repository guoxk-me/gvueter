import type { BackendMenuKind } from '@/features/navigation'
import type { AppAction, AppSubject } from '@/lib/ability'

export interface BreadcrumbItem {
  /** Display label */
  label?: string
  /** Internationalization key for the display label */
  labelKey?: string
  /** Router link target; omit for the current (last) crumb */
  to?: string
}

declare module 'vue-router' {
  interface RouteMeta {
    /** Route requires the user to be authenticated */
    requiresAuth?: boolean
    /** Route is only accessible when NOT authenticated (e.g. login page) */
    requiresGuest?: boolean
    /** CASL permission required to access this route: [action, subject] */
    requiredAbility?: [AppAction, AppSubject]
    /** Stable backend permission code carried from the dynamic menu contract */
    permissionIdentifier?: string
    /** Human-readable page title */
    title?: string
    /** Internationalization key for the page title */
    titleKey?: string
    /** Breadcrumb trail for this route */
    breadcrumb?: BreadcrumbItem[]
    /** Hide this route from navigation while keeping direct access available */
    hidden?: boolean
    /** Stable menu order supplied by the navigation contract */
    order?: number
    /** Safe icon registry key; never a backend-provided component */
    icon?: string
    /** Backend menu destination type */
    menuKind?: BackendMenuKind
    /** Preserve this page instance when a tab host uses KeepAlive */
    keepAlive?: boolean
    /** Component name matched by KeepAlive include */
    cacheKey?: string
    /** Whether successful navigation should open a page tab */
    tab?: boolean
    /** Prevent the tab from being closed by bulk tab actions */
    affix?: boolean
    /** Validated iframe source for iframe menu routes */
    iframeUrl?: string
    /** Marks route records registered from the backend menu contract */
    isDynamic?: boolean
  }
}
