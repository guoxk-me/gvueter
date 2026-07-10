<script setup lang="ts">
import type { AppAction, AppSubject } from '@/lib/ability'
import { LayoutDashboard } from 'lucide-vue-next'
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { appAbility } from '@/lib/ability'

interface NavItem {
  title: string
  to: string
  icon: typeof LayoutDashboard
  ability: [AppAction, AppSubject]
}

const route = useRoute()

const navItems = computed(() => {
  // AI modified: keep ability as a typed tuple for vue-tsc.
  const items: NavItem[] = [
    {
      title: '仪表盘',
      to: '/dashboard',
      icon: LayoutDashboard,
      ability: ['read', 'Dashboard'],
    },
  ]
  return items.filter(item => appAbility.can(item.ability[0], item.ability[1]))
})

function isLeafActive(to: string): boolean {
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>导航</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem v-for="item in navItems" :key="item.title">
          <SidebarMenuButton
            as-child
            :tooltip="item.title"
            :is-active="isLeafActive(item.to)"
            class="group-data-[collapsible=icon]:justify-center"
          >
            <RouterLink :to="item.to">
              <component :is="item.icon" />
              <span class="group-data-[collapsible=icon]:hidden">{{ item.title }}</span>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>
