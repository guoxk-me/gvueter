<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { LogOut, Bell, LayoutDashboard, Palette } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useAppearanceStore } from '@/stores/appearance'
import { appAbility } from '@/lib/ability'
import LanguageToggleButton from '@/components/layout/LanguageToggleButton.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import GlobalSearch from '@/components/layout/GlobalSearch.vue'
import AppearancePanel from '@/components/layout/AppearancePanel.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const authStore = useAuthStore()
const appearance = useAppearanceStore()
const router = useRouter()
const route = useRoute()

const appearancePanelOpen = ref(false)

const userInitials = computed(() => {
  const name = authStore.user?.name ?? ''
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const contentClass = computed(() =>
  appearance.contentWidth === 'boxed' ? 'max-w-screen-xl mx-auto' : '',
)

const headerClass = computed(() => (appearance.stickyHeader ? 'sticky top-0 z-30' : ''))

const navItems = computed(() =>
  [
    {
      title: '仪表盘',
      to: '/dashboard',
      icon: LayoutDashboard,
      ability: ['read', 'Dashboard'] as const,
    },
  ].filter((item) => appAbility.can(item.ability[0], item.ability[1])),
)

function isActive(to: string) {
  return route.path === to || route.path.startsWith(to + '/')
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <!-- Top navigation bar -->
    <header
      :class="[
        'flex h-14 items-center gap-4 border-b border-border bg-background px-4 md:px-6',
        headerClass,
      ]"
    >
      <!-- Logo -->
      <RouterLink to="/dashboard" class="flex items-center gap-2 font-semibold shrink-0">
        <div
          class="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"
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
        <span class="text-foreground">Admin Panel</span>
      </RouterLink>

      <Separator orientation="vertical" class="h-5 mx-1" />

      <!-- Nav items -->
      <nav class="flex items-center gap-1 flex-1">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            isActive(item.to)
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          ]"
        >
          <component :is="item.icon" class="size-4" />
          {{ item.title }}
        </RouterLink>
      </nav>

      <!-- Right side actions -->
      <div class="flex items-center gap-2 shrink-0">
        <GlobalSearch />
        <LanguageToggleButton />
        <button
          class="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          @click="appearancePanelOpen = true"
        >
          <Palette class="size-4" />
        </button>
        <button
          class="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Bell class="size-4" />
        </button>

        <!-- User menu -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              class="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent"
            >
              <Avatar class="size-7 rounded-md">
                <AvatarImage :src="authStore.user?.avatar ?? ''" />
                <AvatarFallback class="rounded-md text-xs">{{ userInitials }}</AvatarFallback>
              </Avatar>
              <span class="hidden sm:block text-sm font-medium">{{ authStore.user?.name }}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-52">
            <DropdownMenuLabel class="font-normal">
              <div class="flex flex-col space-y-1">
                <p class="text-sm font-medium">{{ authStore.user?.name }}</p>
                <p class="text-xs text-muted-foreground">{{ authStore.user?.email }}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem class="text-destructive" @click="handleLogout">
              <LogOut class="mr-2 size-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>

    <!-- Sub-header: breadcrumb -->
    <div class="border-b border-border bg-background px-4 py-2 md:px-6">
      <AppBreadcrumb />
    </div>

    <!-- Page content -->
    <main class="flex-1 overflow-auto p-6">
      <div :class="contentClass">
        <RouterView />
      </div>
    </main>
  </div>

  <AppearancePanel v-model:open="appearancePanelOpen" />
</template>
