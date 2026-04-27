<script setup lang="ts">
import type { Component } from 'vue'
import { computed, ref, watchEffect } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  BarChart3,
  ChevronRight,
  UserCog,
  ShieldCheck,
} from 'lucide-vue-next'
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui'
import { appAbility } from '@/lib/ability'
import type { AppAction, AppSubject } from '@/lib/ability'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavLeaf {
  title: string
  to: string
  icon?: Component
  ability: [AppAction, AppSubject]
}

interface NavGroup {
  title: string
  icon: Component
  ability: [AppAction, AppSubject]
  children: NavLeaf[]
}

type NavItem = NavLeaf | NavGroup

function isNavGroup(item: NavItem): item is NavGroup {
  return 'children' in item
}

// ---------------------------------------------------------------------------
// Nav configuration
// ---------------------------------------------------------------------------

const allNavItems: NavItem[] = [
  {
    title: '仪表盘',
    to: '/dashboard',
    icon: LayoutDashboard,
    ability: ['read', 'Dashboard'],
  },
  {
    title: '用户管理',
    icon: Users,
    ability: ['read', 'User'],
    children: [
      { title: '用户列表', to: '/users', icon: Users, ability: ['read', 'User'] },
      { title: '角色权限', to: '/users/roles', icon: ShieldCheck, ability: ['read', 'User'] },
      { title: '账号设置', to: '/users/settings', icon: UserCog, ability: ['read', 'User'] },
    ],
  },
  {
    title: '内容管理',
    to: '/content',
    icon: FileText,
    ability: ['read', 'Content'],
  },
  {
    title: '数据分析',
    to: '/analytics',
    icon: BarChart3,
    ability: ['read', 'Analytics'],
  },
  {
    title: '系统设置',
    icon: Settings,
    ability: ['read', 'Settings'],
    children: [
      { title: '基本设置', to: '/settings/general', icon: Settings, ability: ['read', 'Settings'] },
      {
        title: '安全设置',
        to: '/settings/security',
        icon: ShieldCheck,
        ability: ['read', 'Settings'],
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// CASL filtering
// ---------------------------------------------------------------------------

function filterLeaves(leaves: NavLeaf[]): NavLeaf[] {
  return leaves.filter((leaf) => appAbility.can(leaf.ability[0], leaf.ability[1]))
}

const navItems = computed<NavItem[]>(() => {
  const result: NavItem[] = []
  for (const item of allNavItems) {
    if (!appAbility.can(item.ability[0], item.ability[1])) continue

    if (isNavGroup(item)) {
      const visibleChildren = filterLeaves(item.children)
      // Only show the group if at least one child is visible
      if (visibleChildren.length > 0) {
        result.push({ ...item, children: visibleChildren })
      }
    } else {
      result.push(item)
    }
  }
  return result
})

// ---------------------------------------------------------------------------
// Active route helpers
// ---------------------------------------------------------------------------

const route = useRoute()

function isLeafActive(to: string): boolean {
  return route.path === to || route.path.startsWith(to + '/')
}

function isGroupActive(children: NavLeaf[]): boolean {
  return children.some((child) => isLeafActive(child.to))
}

// ---------------------------------------------------------------------------
// Collapsible open state
// Each group item tracks its own open state; auto-opens when a child is active.
// ---------------------------------------------------------------------------

// Map: group title → open ref
const openGroups = ref<Record<string, boolean>>({})

// Auto-expand the group whose child matches the current route
watchEffect(() => {
  for (const item of navItems.value) {
    if (isNavGroup(item)) {
      if (isGroupActive(item.children)) {
        openGroups.value[item.title] = true
      }
    }
  }
})
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>导航</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        <template v-for="item in navItems" :key="item.title">
          <!-- ── Leaf item (no children) ── -->
          <SidebarMenuItem v-if="!isNavGroup(item)">
            <SidebarMenuButton
              as-child
              :tooltip="item.title"
              :is-active="isLeafActive((item as NavLeaf).to)"
              class="group-data-[collapsible=icon]:justify-center"
            >
              <RouterLink :to="(item as NavLeaf).to">
                <component :is="item.icon" />
                <span class="group-data-[collapsible=icon]:hidden">{{ item.title }}</span>
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <!-- ── Group item (has children) ── -->
          <SidebarMenuItem v-else>
            <CollapsibleRoot
              :open="!!openGroups[item.title]"
              @update:open="(val) => (openGroups[item.title] = val)"
              class="group/collapsible"
            >
              <!-- Trigger: parent button -->
              <CollapsibleTrigger as-child>
                <SidebarMenuButton
                  :tooltip="item.title"
                  :is-active="isGroupActive((item as NavGroup).children)"
                  class="group-data-[collapsible=icon]:justify-center"
                >
                  <component :is="item.icon" />
                  <span class="group-data-[collapsible=icon]:hidden">{{ item.title }}</span>
                  <ChevronRight
                    class="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden"
                  />
                </SidebarMenuButton>
              </CollapsibleTrigger>

              <!-- Sub menu -->
              <CollapsibleContent>
                <SidebarMenuSub>
                  <SidebarMenuSubItem v-for="child in (item as NavGroup).children" :key="child.to">
                    <SidebarMenuSubButton as-child :is-active="isLeafActive(child.to)">
                      <RouterLink :to="child.to">
                        <component :is="child.icon" v-if="child.icon" />
                        <span>{{ child.title }}</span>
                      </RouterLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </CollapsibleContent>
            </CollapsibleRoot>
          </SidebarMenuItem>
        </template>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
