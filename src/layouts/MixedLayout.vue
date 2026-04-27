<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import {
  LogOut,
  Bell,
  LayoutDashboard,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
} from 'lucide-vue-next'
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

// Sub-sidebar collapsed state
const sidebarOpen = ref(appearance.sidebarDefault === 'expanded')
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

// Primary nav groups (flat for now, can be extended to tree)
const primaryNavItems = computed(() =>
  [
    {
      title: '仪表盘',
      to: '/dashboard',
      icon: LayoutDashboard,
      ability: ['read', 'Dashboard'] as const,
    },
  ].filter((item) => appAbility.can(item.ability[0], item.ability[1])),
)

// Secondary nav: items for currently active section
const secondaryNavItems = computed(() => {
  // Extend here per section as pages grow
  return primaryNavItems.value.filter(
    (item) => route.path === item.to || route.path.startsWith(item.to + '/'),
  )
})

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
    <!-- Primary top navigation bar -->
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
        <span class="text-foreground hidden sm:block">Admin Panel</span>
      </RouterLink>

      <Separator orientation="vertical" class="h-5 mx-1" />

      <!-- Primary nav -->
      <nav class="flex items-center gap-1 flex-1">
        <RouterLink
          v-for="item in primaryNavItems"
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
          <span class="hidden md:inline">{{ item.title }}</span>
        </RouterLink>
      </nav>

      <!-- Right actions -->
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
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              class="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent"
            >
              <Avatar class="size-7 rounded-md">
                <AvatarImage :src="authStore.user?.avatar ?? ''" />
                <AvatarFallback class="rounded-md text-xs">{{ userInitials }}</AvatarFallback>
              </Avatar>
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

    <!-- Body: secondary sidebar + content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Secondary sidebar -->
      <aside
        :class="[
          'flex flex-col border-r border-border bg-sidebar transition-all duration-200 shrink-0',
          sidebarOpen ? 'w-52' : 'w-12',
        ]"
      >
        <!-- Toggle button -->
        <div class="flex h-10 items-center justify-end px-2 border-b border-border">
          <button
            class="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            @click="sidebarOpen = !sidebarOpen"
          >
            <PanelLeftClose v-if="sidebarOpen" class="size-4" />
            <PanelLeftOpen v-else class="size-4" />
          </button>
        </div>

        <!-- Secondary nav items -->
        <nav class="flex flex-col gap-0.5 p-2 flex-1">
          <RouterLink
            v-for="item in secondaryNavItems"
            :key="item.to"
            :to="item.to"
            :class="[
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
              isActive(item.to)
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            ]"
          >
            <component :is="item.icon" class="size-4 shrink-0" />
            <span v-if="sidebarOpen" class="truncate">{{ item.title }}</span>
          </RouterLink>

          <!-- Fallback: no sub-items message -->
          <p
            v-if="secondaryNavItems.length === 0 && sidebarOpen"
            class="px-2 py-1.5 text-xs text-muted-foreground"
          >
            暂无子菜单
          </p>
        </nav>
      </aside>

      <!-- Main content -->
      <div class="flex flex-1 flex-col overflow-auto">
        <!-- Breadcrumb sub-header -->
        <div class="flex h-10 items-center gap-2 border-b border-border bg-background px-4">
          <ChevronRight class="size-3.5 text-muted-foreground" />
          <AppBreadcrumb />
        </div>
        <main class="flex-1 overflow-auto p-6">
          <div :class="contentClass">
            <RouterView />
          </div>
        </main>
      </div>
    </div>
  </div>

  <AppearancePanel v-model:open="appearancePanelOpen" />
</template>
