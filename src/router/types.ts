import type { AppAction, AppSubject } from '@/lib/ability'

export interface BreadcrumbItem {
  /** Display label */
  label: string
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
    /** Human-readable page title */
    title?: string
    /** Breadcrumb trail for this route */
    breadcrumb?: BreadcrumbItem[]
  }
}
