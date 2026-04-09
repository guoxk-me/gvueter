<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import AppIcon from "@/components/AppIcon.vue";
import { isRouteAccessible } from "@/lib/access";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { navigationGroups } from "@/router/routes";
import { useAuthStore } from "@/stores/auth";
import { useTenantStore } from "@/stores/tenant";

const open = defineModel<boolean>("open", { default: false });

const router = useRouter();
const auth = useAuthStore();
const tenant = useTenantStore();
const { t } = useI18n();

const routeCommands = computed(() => {
  return navigationGroups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      groupTitle: t(group.titleKey),
      label: t(item.titleKey),
      allowed:
        !item.requiredAbilities && !item.requiredFeatures
          ? true
          : isRouteAccessible(
              {
                requiredAbilities: item.requiredAbilities,
                requiredFeatures: item.requiredFeatures,
              },
              auth.user,
              (feature) => tenant.hasFeature(feature),
            ),
    })),
  );
});

const recentCommands = computed(() => [
  {
    id: "theme-studio",
    icon: "lucide:sparkles",
    label: t("topbar.theme"),
    shortcut: "Shift T",
    action: async () => {
      window.dispatchEvent(new CustomEvent("gvueter:open-theme-studio"));
      open.value = false;
    },
  },
  {
    id: "profile",
    icon: "lucide:user-round-cog",
    label: t("common.profile"),
    shortcut: "G P",
    action: async () => {
      open.value = false;
      await router.push({ name: "profile" });
    },
  },
  {
    id: "sign-out",
    icon: "lucide:log-out",
    label: t("common.signOut"),
    shortcut: "Shift Q",
    action: async () => {
      auth.logout();
      open.value = false;
      await router.push({ name: "login" });
    },
  },
]);

const groupedRoutes = computed(() => {
  return navigationGroups.map((group) => ({
    id: group.id,
    title: t(group.titleKey),
    items: routeCommands.value.filter((item) => item.groupTitle === t(group.titleKey)),
  }));
});

const switchRoute = async (name: string) => {
  open.value = false;
  await router.push({ name });
};

const switchTenant = async (tenantId: string) => {
  tenant.switchTenant(tenantId);
  open.value = false;
  if (router.currentRoute.value.name !== "tenants") {
    await router.push({ name: "tenants" });
  }
};
</script>

<template>
  <CommandDialog
    v-model:open="open"
    title="Global Command Palette"
    description="Jump across routes, switch tenant context or trigger operator actions."
  >
    <CommandInput :placeholder="t('common.search')" />
    <CommandList class="max-h-[460px]">
      <CommandEmpty>No matching commands. Try another route, tenant or action.</CommandEmpty>

      <CommandGroup heading="Quick actions">
        <CommandItem
          v-for="command in recentCommands"
          :key="command.id"
          :value="command.label"
          class="rounded-xl"
          @select="command.action"
        >
          <AppIcon :icon="command.icon" />
          <span>{{ command.label }}</span>
          <CommandShortcut>{{ command.shortcut }}</CommandShortcut>
        </CommandItem>
      </CommandGroup>

      <CommandSeparator />

      <CommandGroup v-for="group in groupedRoutes" :key="group.id" :heading="group.title">
        <CommandItem
          v-for="item in group.items"
          :key="item.name"
          :value="item.label"
          class="rounded-xl"
          :disabled="!item.allowed"
          @select="switchRoute(item.name)"
        >
          <AppIcon :icon="item.icon" />
          <span>{{ item.label }}</span>
          <CommandShortcut>{{
            item.allowed ? "Route" : t("permissions.restricted")
          }}</CommandShortcut>
        </CommandItem>
      </CommandGroup>

      <CommandSeparator />

      <CommandGroup heading="Tenant context">
        <CommandItem
          v-for="tenantItem in tenant.availableTenants"
          :key="tenantItem.id"
          :value="`${tenantItem.name} ${tenantItem.plan} ${tenantItem.region}`"
          class="rounded-xl"
          @select="switchTenant(tenantItem.id)"
        >
          <AppIcon icon="lucide:building-2" />
          <span>{{ tenantItem.name }}</span>
          <CommandShortcut>
            {{ tenant.currentTenant?.id === tenantItem.id ? "Active" : tenantItem.region }}
          </CommandShortcut>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
