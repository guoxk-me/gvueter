<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

import AppIcon from "@/components/AppIcon.vue";
import AppCommandPalette from "@/components/shared/AppCommandPalette.vue";
import PermissionBadge from "@/components/shared/PermissionBadge.vue";
import ThemeStudio from "@/components/shared/ThemeStudio.vue";
import { isRouteAccessible } from "@/lib/access";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { navigationGroups } from "@/router/routes";
import { useAuthStore } from "@/stores/auth";
import { useTenantStore } from "@/stores/tenant";
import { notificationItems } from "@/data/admin";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const tenant = useTenantStore();
const { t } = useI18n();
const isThemeStudioOpen = ref(false);
const isCommandPaletteOpen = ref(false);

const pageTitle = computed(() => {
  return route.meta.titleKey ? t(route.meta.titleKey) : t("app.name");
});

const pageDescription = computed(() => {
  if (route.name === "dashboard") {
    return t("dashboard.description");
  }

  const descriptionKey = String(route.meta.titleKey || "").replace(/title$/, "description");
  return descriptionKey !== route.meta.titleKey ? t(descriptionKey) : t("app.description");
});

const accessibleNavigationGroups = computed(() => {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        isRouteAccessible(
          {
            requiredAbilities: item.requiredAbilities,
            requiredFeatures: item.requiredFeatures,
          },
          auth.user,
          (feature) => tenant.hasFeature(feature),
        ),
      ),
    }))
    .filter((group) => group.items.length > 0);
});

const userInitials = computed(() => {
  if (!auth.user?.name) {
    return "GV";
  }

  return auth.user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
});

const signOut = async () => {
  auth.logout();
  await router.push({ name: "login" });
};

const handleGlobalKeydown = (event: KeyboardEvent) => {
  const isModifier = event.metaKey || event.ctrlKey;

  if (isModifier && event.key.toLowerCase() === "k") {
    event.preventDefault();
    isCommandPaletteOpen.value = !isCommandPaletteOpen.value;
  }

  if (event.shiftKey && event.key.toLowerCase() === "t") {
    event.preventDefault();
    isThemeStudioOpen.value = true;
  }
};

const handleThemeStudioEvent = () => {
  isThemeStudioOpen.value = true;
};

onMounted(() => {
  window.addEventListener("keydown", handleGlobalKeydown);
  window.addEventListener("gvueter:open-theme-studio", handleThemeStudioEvent);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleGlobalKeydown);
  window.removeEventListener("gvueter:open-theme-studio", handleThemeStudioEvent);
});
</script>

<template>
  <SidebarProvider class="bg-background text-foreground">
    <Sidebar
      collapsible="icon"
      variant="inset"
      class="border-r border-sidebar-border/60 bg-sidebar/90 backdrop-blur-xl"
    >
      <SidebarHeader class="px-3 pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              class="rounded-2xl border border-white/10 bg-linear-to-r from-primary/20 via-primary/10 to-transparent text-sidebar-foreground shadow-lg shadow-primary/10"
            >
              <div
                class="flex size-11 items-center justify-center rounded-2xl bg-primary/90 text-primary-foreground shadow-[0_0_30px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
              >
                <AppIcon icon="lucide:command" class="size-5" />
              </div>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate text-[0.95rem] font-semibold">{{ t("app.name") }}</span>
                <span class="truncate text-xs text-sidebar-foreground/70"
                  >Premium multi-tenant shell</span
                >
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div class="mt-3 flex flex-wrap gap-2 px-1">
          <PermissionBadge
            :allowed="auth.can({ action: 'manage', resource: 'tenants' })"
            :allowed-label="auth.user?.title ?? t('permissions.allowed')"
            :denied-label="t('permissions.restricted')"
          />
          <PermissionBadge
            :allowed="tenant.hasFeature('workflowApprovals')"
            allowed-label="Workflow on"
            denied-label="Workflow off"
          />
        </div>
      </SidebarHeader>

      <SidebarContent class="px-3 pb-4">
        <SidebarGroup v-for="group in accessibleNavigationGroups" :key="group.id">
          <SidebarGroupLabel>{{ t(group.titleKey) }}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem v-for="item in group.items" :key="item.name">
                <SidebarMenuButton
                  as-child
                  :is-active="route.name === item.name"
                  :tooltip="t(item.titleKey)"
                >
                  <RouterLink :to="item.to">
                    <AppIcon :icon="item.icon" />
                    <span>{{ t(item.titleKey) }}</span>
                  </RouterLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator class="mx-3 w-auto" />

      <SidebarFooter class="px-3 pb-4 pt-4">
        <div
          class="rounded-3xl border border-white/10 bg-sidebar-accent/60 p-4 shadow-inner shadow-primary/5"
        >
          <div class="mb-2 flex items-center gap-2 text-sm font-medium">
            <AppIcon icon="lucide:building-2" class="size-4 text-primary" />
            {{ tenant.currentTenant?.name }}
          </div>
          <p class="text-xs leading-6 text-sidebar-foreground/70">
            {{ tenant.currentTenant?.plan }} · {{ tenant.currentTenant?.region }} ·
            {{ tenant.currentTenant?.members }} members
          </p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>

    <SidebarInset class="relative bg-transparent">
      <div
        class="pointer-events-none absolute inset-0 opacity-70"
        :style="{ backgroundImage: 'var(--surface-glow)' }"
      />
      <header class="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div class="flex flex-wrap items-center gap-4 px-4 py-3 md:px-6">
          <div class="flex items-center gap-2">
            <SidebarTrigger class="rounded-xl border border-border/70 bg-background/60 shadow-sm" />
            <div>
              <div class="text-sm font-medium text-muted-foreground">
                {{ tenant.currentTenant?.name }}
              </div>
              <div class="text-lg font-semibold tracking-tight">{{ pageTitle }}</div>
            </div>
          </div>

          <div
            class="min-w-[240px] flex-1 rounded-2xl border border-border/70 bg-card/75 px-4 py-2 text-sm text-muted-foreground shadow-inner shadow-primary/5"
          >
            <button
              type="button"
              class="flex w-full items-center justify-between gap-3 text-left"
              @click="isCommandPaletteOpen = true"
            >
              <span>{{ t("common.search") }}</span>
              <kbd
                class="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                Cmd K
              </kbd>
            </button>
          </div>

          <div class="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="outline"
                  class="rounded-full border-border/70 bg-background/70 px-3"
                >
                  <AppIcon icon="lucide:bell-ring" class="size-4 text-primary" />
                  <span class="hidden md:inline">{{ t("topbar.notifications") }}</span>
                  <Badge variant="secondary" class="rounded-full">{{
                    notificationItems.length
                  }}</Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-80 rounded-2xl border-border/60 p-2">
                <DropdownMenuLabel>{{ t("topbar.notifications") }}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  v-for="item in notificationItems"
                  :key="item"
                  class="rounded-xl py-3 text-sm leading-6"
                >
                  {{ item }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="outline"
                  class="rounded-full border-border/70 bg-background/70 px-3"
                >
                  <AppIcon icon="lucide:layers-3" class="size-4 text-primary" />
                  <span class="hidden xl:inline">{{ tenant.currentWorkspace?.name }}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-80 rounded-2xl border-border/60 p-2">
                <DropdownMenuLabel>{{ t("topbar.switchWorkspace") }}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  v-for="workspace in tenant.availableWorkspaces"
                  :key="workspace.id"
                  class="rounded-xl py-3"
                  @click="tenant.switchWorkspace(workspace.id)"
                >
                  <div class="flex flex-1 items-center justify-between gap-3">
                    <div>
                      <div class="text-sm font-medium">{{ workspace.name }}</div>
                      <div class="text-xs text-muted-foreground">
                        {{ workspace.environment }} · {{ workspace.region }} ·
                        {{ workspace.members }} members
                      </div>
                    </div>
                    <Badge
                      :variant="
                        tenant.currentWorkspace?.id === workspace.id ? 'secondary' : 'outline'
                      "
                      class="rounded-full"
                    >
                      {{
                        tenant.currentWorkspace?.id === workspace.id
                          ? t("common.active")
                          : workspace.environment
                      }}
                    </Badge>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="outline"
                  class="rounded-full border-border/70 bg-background/70 px-3"
                >
                  <AppIcon icon="lucide:building-2" class="size-4 text-primary" />
                  <span class="hidden lg:inline">{{ tenant.currentTenant?.name }}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-72 rounded-2xl border-border/60 p-2">
                <DropdownMenuLabel>{{ t("topbar.switchTenant") }}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  v-for="tenantItem in tenant.availableTenants"
                  :key="tenantItem.id"
                  class="rounded-xl py-3"
                  @click="tenant.switchTenant(tenantItem.id)"
                >
                  <div class="flex flex-1 items-center justify-between gap-3">
                    <div>
                      <div class="text-sm font-medium">{{ tenantItem.name }}</div>
                      <div class="text-xs text-muted-foreground">
                        {{ tenantItem.plan }} · {{ tenantItem.region }}
                      </div>
                    </div>
                    <Badge
                      :variant="
                        tenant.currentTenant?.id === tenantItem.id ? 'secondary' : 'outline'
                      "
                      class="rounded-full"
                    >
                      {{
                        tenant.currentTenant?.id === tenantItem.id
                          ? t("common.active")
                          : tenantItem.members
                      }}
                    </Badge>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Sheet v-model:open="isThemeStudioOpen">
              <SheetTrigger as-child>
                <Button
                  variant="outline"
                  class="rounded-full border-border/70 bg-background/70 px-3"
                >
                  <AppIcon icon="lucide:sparkles" class="size-4 text-primary" />
                  <span class="hidden md:inline">{{ t("topbar.theme") }}</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                class="w-full max-w-xl border-border/60 bg-background/95 backdrop-blur-xl"
              >
                <SheetHeader>
                  <SheetTitle>{{ t("topbar.theme") }}</SheetTitle>
                  <SheetDescription>
                    Multi-brand appearance controls, ready for full edition tenant overrides.
                  </SheetDescription>
                </SheetHeader>
                <div class="mt-6">
                  <ThemeStudio />
                </div>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" class="h-auto rounded-full px-2 py-1.5">
                  <Avatar class="size-10 border border-primary/20 shadow-lg shadow-primary/10">
                    <AvatarFallback class="bg-primary/15 text-primary">{{
                      userInitials
                    }}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-64 rounded-2xl border-border/60 p-2">
                <DropdownMenuLabel class="rounded-xl py-3">
                  <div class="text-sm font-semibold">{{ auth.user?.name }}</div>
                  <div class="text-xs font-normal text-muted-foreground">
                    {{ auth.user?.title }}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem class="rounded-xl" @click="router.push({ name: 'profile' })">
                  {{ t("common.profile") }}
                </DropdownMenuItem>
                <DropdownMenuItem class="rounded-xl" @click="signOut">
                  {{ t("common.signOut") }}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main class="relative px-4 py-6 md:px-6 md:py-8">
        <div
          class="mb-6 rounded-3xl border border-white/10 bg-card/70 p-6 shadow-[0_18px_50px_-34px_color-mix(in_oklab,var(--primary)_45%,transparent)] backdrop-blur-sm"
        >
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div class="mb-2 text-sm font-medium text-primary">
                {{ tenant.currentTenant?.plan }}
              </div>
              <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">
                {{ pageTitle }}
              </h1>
              <p class="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                {{ pageDescription }}
              </p>
              <div class="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant="outline" class="rounded-full">
                  {{ t("common.tenant") }} · {{ tenant.currentTenant?.name }}
                </Badge>
                <Badge variant="outline" class="rounded-full">
                  {{ t("common.workspace") }} · {{ tenant.currentWorkspace?.name }}
                </Badge>
              </div>
            </div>
            <div
              class="flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
            >
              <AppIcon icon="lucide:shield-check" class="size-4" />
              Full Edition Ready
            </div>
          </div>
        </div>

        <RouterView />
      </main>
    </SidebarInset>
  </SidebarProvider>

  <AppCommandPalette v-model:open="isCommandPaletteOpen" />
</template>
