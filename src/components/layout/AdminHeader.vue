<script setup lang="ts">
import type { NavigationMenuNode } from '@/features/navigation'
import { Bell, KeyRound, LogOut, Menu, Palette, UserRound } from '@lucide/vue'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import GlobalSearch from '@/components/layout/GlobalSearch.vue'
import LanguageToggleButton from '@/components/layout/LanguageToggleButton.vue'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createRuntimeNotificationTransport } from '@/features/notifications'
import {
  useNotificationRealtime,
  useNotificationUnreadCount,
} from '@/features/notifications/composables/useNotificationRealtime'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import AdminTopNavigation from './AdminTopNavigation.vue'

const props = withDefaults(
  defineProps<{
    isMobileNavigationOpen: boolean
    showBrand?: boolean
    navigationNodes?: NavigationMenuNode[]
  }>(),
  {
    showBrand: true,
    navigationNodes: () => [],
  },
)

const emit = defineEmits<{
  openAppearance: []
  toggleMobileNavigation: []
  navigationNodeSelected: [node: NavigationMenuNode]
}>()

const auth = useAuthStore()
const notificationStore = useNotificationStore()
const router = useRouter()
const { t } = useI18n()
const isTopNavigationOverflowing = shallowRef(false)
const searchExpansionReserve = shallowRef(0)

useNotificationUnreadCount()
// AI modified: every authenticated principal owns a transport with an immutable session credential.
useNotificationRealtime((sessionToken) => createRuntimeNotificationTransport(() => sessionToken))

const userInitials = computed(() => {
  const words = (auth.user?.name ?? '').trim().split(/\s+/).filter(Boolean)
  return (
    words
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'A'
  )
})

async function logout(): Promise<void> {
  try {
    await auth.logout()
  } catch {
    // AI modified: local logout and guest navigation remain mandatory when server revocation fails.
    toast.error(t('auth.logoutRevocationFailed'))
  } finally {
    await router.replace('/login')
  }
}

watch(
  () => props.navigationNodes.length,
  (navigationCount) => {
    // AI modified: layout changes cannot leave search in the compact top-navigation state.
    if (navigationCount === 0) isTopNavigationOverflowing.value = false
  },
)
</script>

<template>
  <header
    class="flex h-[var(--admin-shell-header-height)] min-w-0 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur md:px-4"
    data-layout-region="header"
  >
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      class="lg:hidden"
      :aria-label="t('nav.navigation')"
      aria-controls="admin-mobile-navigation"
      :aria-expanded="isMobileNavigationOpen"
      @click="emit('toggleMobileNavigation')"
    >
      <Menu class="size-4" aria-hidden="true" />
    </Button>

    <!-- AI modified: browser translation must preserve the Shell brand as one stable name. -->
    <RouterLink
      to="/dashboard"
      class="flex shrink-0 items-center gap-2 font-semibold text-foreground"
      :class="props.showBrand ? '' : 'lg:hidden'"
      translate="no"
    >
      <span
        class="flex size-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground shadow-sm"
      >
        A
      </span>
      <span class="hidden sm:inline">{{ t('common.appTitle') }}</span>
    </RouterLink>

    <div
      v-if="props.navigationNodes.length"
      class="ml-2 hidden min-w-0 flex-1 overflow-hidden lg:block"
    >
      <AdminTopNavigation
        :nodes="props.navigationNodes"
        :restoration-reserve="isTopNavigationOverflowing ? searchExpansionReserve : 0"
        @node-selected="emit('navigationNodeSelected', $event)"
        @overflow-change="isTopNavigationOverflowing = $event"
      />
    </div>
    <div v-else class="flex-1" />

    <!-- AI modified: actions reserve their own width instead of visually covering overflowing navigation. -->
    <div class="ml-auto flex shrink-0 items-center gap-1 pl-2">
      <GlobalSearch
        :compact="isTopNavigationOverflowing"
        @width-reserve-change="searchExpansionReserve = $event"
      />
      <LanguageToggleButton />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        :aria-label="t('appearance.title')"
        :title="t('appearance.title')"
        @click="emit('openAppearance')"
      >
        <Palette class="size-4" aria-hidden="true" />
      </Button>
      <Button as-child variant="ghost" size="icon-sm" class="relative">
        <!-- AI modified: the persisted unread count is reachable from every authenticated layout. -->
        <RouterLink
          to="/message-center"
          :aria-label="`${t('notifications.title')}: ${notificationStore.unreadCount}`"
          :title="t('notifications.title')"
        >
          <Bell class="size-4" aria-hidden="true" />
          <span
            v-if="notificationStore.unreadCount > 0"
            class="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-destructive-foreground"
          >
            {{ notificationStore.unreadCount > 99 ? '99+' : notificationStore.unreadCount }}
          </span>
        </RouterLink>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button type="button" variant="ghost" class="h-9 gap-2 px-1.5 sm:px-2">
            <Avatar class="size-7 rounded-md">
              <!-- AI modified: adjacent button text already names the account, so its avatar is decorative. -->
              <AvatarImage :src="auth.user?.avatar ?? ''" alt="" aria-hidden="true" />
              <AvatarFallback class="rounded-md text-xs">
                {{ userInitials }}
              </AvatarFallback>
            </Avatar>
            <span class="hidden max-w-28 truncate text-sm sm:inline">{{ auth.user?.name }}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuLabel class="font-normal">
            <p class="truncate text-sm font-medium">
              {{ auth.user?.name }}
            </p>
            <p class="truncate text-xs text-muted-foreground">
              {{ auth.user?.email }}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem as-child>
            <RouterLink to="/profile">
              <UserRound class="size-4" aria-hidden="true" />
              {{ t('nav.profile') }}
            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem as-child>
            <RouterLink to="/change-password">
              <KeyRound class="size-4" aria-hidden="true" />
              {{ t('nav.changePassword') }}
            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" @select="logout">
            <LogOut class="size-4" aria-hidden="true" />
            {{ t('auth.logout') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>
