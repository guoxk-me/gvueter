<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { LogOut, ChevronUp, Bell, Settings } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import GlobalSearch from '@/components/layout/GlobalSearch.vue'
import AppSidebarNav from '@/components/layout/AppSidebarNav.vue'

const authStore = useAuthStore()
const router = useRouter()

const userInitials = computed(() => {
  const name = authStore.user?.name ?? ''
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <SidebarProvider>
    <Sidebar collapsible="icon">
      <!-- Sidebar Header: Logo -->
      <SidebarHeader>
        <RouterLink
          to="/dashboard"
          class="flex h-12 items-center gap-3 px-3 transition-colors hover:opacity-80 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0"
        >
          <div
            class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          >
            <svg
              class="size-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              />
            </svg>
          </div>

          <div
            class="flex min-w-0 flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden"
          >
            <span class="truncate font-semibold text-foreground">Admin Panel</span>
            <span class="text-xs text-muted-foreground">v1.0.0</span>
          </div>
        </RouterLink>
      </SidebarHeader>

      <!-- Sidebar Content: Permission-filtered navigation -->
      <SidebarContent>
        <AppSidebarNav />
      </SidebarContent>

      <!-- Sidebar Footer: User menu -->
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <SidebarMenuButton
                  size="lg"
                  class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
                >
                  <Avatar class="size-8 rounded-lg">
                    <AvatarImage :src="authStore.user?.avatar ?? ''" />
                    <AvatarFallback class="rounded-lg text-xs">{{ userInitials }}</AvatarFallback>
                  </Avatar>
                  <div
                    class="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden"
                  >
                    <span class="truncate font-semibold">{{ authStore.user?.name }}</span>
                    <span class="truncate text-xs text-muted-foreground">{{
                      authStore.user?.email
                    }}</span>
                  </div>
                  <ChevronUp class="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" class="w-56">
                <DropdownMenuLabel class="font-normal">
                  <div class="flex flex-col space-y-1">
                    <p class="text-sm font-medium">{{ authStore.user?.name }}</p>
                    <p class="text-xs text-muted-foreground">{{ authStore.user?.email }}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem as-child>
                  <RouterLink to="/settings">
                    <Settings class="mr-2 size-4" />
                    账号设置
                  </RouterLink>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem class="text-destructive" @click="handleLogout">
                  <LogOut class="mr-2 size-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>

    <!-- Main content area -->
    <SidebarInset>
      <!-- Top header bar -->
      <header
        class="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4"
      >
        <SidebarTrigger class="-ml-1" />
        <Separator orientation="vertical" class="mx-1 h-4" />

        <!-- Breadcrumb -->
        <div class="flex-1 min-w-0">
          <AppBreadcrumb />
        </div>

        <!-- Right side actions -->
        <div class="flex items-center gap-2">
          <!-- Global search -->
          <GlobalSearch />

          <!-- Notifications -->
          <button
            class="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Bell class="size-4" />
          </button>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-auto p-6">
        <RouterView />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>
