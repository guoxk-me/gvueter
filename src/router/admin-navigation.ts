import type { Component } from 'vue'
import type { AppAction, AppSubject } from '@/lib/ability'
import {
  Bell,
  Blocks,
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  FilePenLine,
  LayoutDashboard,
  ListTree,
  Megaphone,
  MonitorCog,
  Receipt,
  Settings2,
  ShieldCheck,
  UsersRound,
} from '@lucide/vue'
import { getAdminIconComponent } from '@/components/admin/icon-selector'
import { componentCenterModules } from '@/features/component-gallery/component-center-modules'

export interface AdminNavigationItem {
  labelKey: string
  groupKey: string
  to: string
  icon: Component
  ability: [AppAction, AppSubject]
}

export function getAdminNavigationIcon(iconKey: string | undefined): Component {
  // AI modified: navigation and IconSelector now share one audited registry and explicit unknown-key fallback.
  return getAdminIconComponent(iconKey)
}

// AI modified: share this metadata between the sidebar and command search.
export const adminNavigationItems: AdminNavigationItem[] = [
  {
    labelKey: 'nav.dashboard',
    groupKey: 'nav.workspace',
    to: '/dashboard',
    icon: LayoutDashboard,
    ability: ['read', 'Dashboard'],
  },
  {
    labelKey: 'nav.messageCenter',
    groupKey: 'nav.workspace',
    to: '/message-center',
    icon: Bell,
    ability: ['read', 'Dashboard'],
  },
  {
    labelKey: 'nav.components',
    groupKey: 'nav.workspace',
    to: '/components',
    icon: Blocks,
    ability: ['read', 'Dashboard'],
  },
  // AI modified: every independent component route is discoverable without expanding the primary backend menu contract.
  ...componentCenterModules.map<AdminNavigationItem>(componentModule => ({
    labelKey: componentModule.titleKey,
    groupKey: 'nav.components',
    to: componentModule.path,
    icon: componentModule.icon,
    ability: ['read', 'Dashboard'],
  })),
  {
    labelKey: 'nav.formWorkbench',
    groupKey: 'nav.workspace',
    to: '/form-workbench',
    icon: FilePenLine,
    ability: ['read', 'Content'],
  },
  {
    labelKey: 'nav.contentAdmin',
    groupKey: 'nav.workspace',
    to: '/content-admin',
    icon: Megaphone,
    ability: ['read', 'Content'],
  },
  {
    labelKey: 'nav.monitoring',
    groupKey: 'nav.workspace',
    to: '/monitoring',
    icon: MonitorCog,
    // AI modified: monitoring discovery follows its dedicated backend-issued grant.
    ability: ['read', 'Monitoring'],
  },
  {
    labelKey: 'nav.auditLogs',
    groupKey: 'nav.workspace',
    to: '/audit-logs',
    icon: Receipt,
    // AI modified: audit discovery is independent from the Content administration grant.
    ability: ['read', 'AuditLog'],
  },
  {
    labelKey: 'nav.users',
    groupKey: 'nav.administration',
    to: '/users',
    icon: UsersRound,
    ability: ['read', 'User'],
  },
  {
    labelKey: 'nav.roles',
    groupKey: 'nav.administration',
    to: '/roles',
    icon: ShieldCheck,
    ability: ['read', 'Settings'],
  },
  {
    labelKey: 'nav.departments',
    groupKey: 'nav.administration',
    to: '/departments',
    icon: Building2,
    ability: ['read', 'Settings'],
  },
  {
    labelKey: 'nav.positions',
    groupKey: 'nav.administration',
    to: '/positions',
    icon: BriefcaseBusiness,
    ability: ['read', 'Settings'],
  },
  {
    labelKey: 'nav.menus',
    groupKey: 'nav.administration',
    to: '/menus',
    icon: ListTree,
    ability: ['read', 'Settings'],
  },
  {
    labelKey: 'nav.dictionaries',
    groupKey: 'nav.administration',
    to: '/dictionaries',
    icon: BookOpenText,
    ability: ['read', 'Settings'],
  },
  {
    labelKey: 'nav.systemConfig',
    groupKey: 'nav.administration',
    to: '/system-config',
    icon: Settings2,
    ability: ['read', 'Settings'],
  },
  {
    labelKey: 'nav.systemParameters',
    groupKey: 'nav.administration',
    to: '/system-config/parameters',
    icon: Settings2,
    ability: ['read', 'Settings'],
  },
]
