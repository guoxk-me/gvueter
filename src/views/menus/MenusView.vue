<script setup lang="ts">
import type { ColumnDef } from "@tanstack/vue-table";
import { computed, h, ref } from "vue";
import { useI18n } from "vue-i18n";

import AppIcon from "@/components/AppIcon.vue";
import DataTablePreview from "@/components/shared/DataTablePreview.vue";
import DataTableToolbar from "@/components/shared/DataTableToolbar.vue";
import GovernanceActionDialog from "@/components/shared/GovernanceActionDialog.vue";
import PageHeader from "@/components/shared/PageHeader.vue";
import PermissionBadge from "@/components/shared/PermissionBadge.vue";
import StatCard from "@/components/shared/StatCard.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { menuViews, menus } from "@/data/admin";
import { hasAbility } from "@/lib/access";
import { useAuthStore } from "@/stores/auth";
import { useGovernanceDraftsStore } from "@/stores/governance-drafts";

type MenuRecord = (typeof menus)[number];

const { t } = useI18n();
const auth = useAuthStore();
const drafts = useGovernanceDraftsStore();
const query = ref("");
const filterValue = ref("all");
const activeView = ref("all");
const isActionOpen = ref(false);

const menuDraft = drafts.menuRegistryDraft;

const canManageMenus = computed(() =>
  hasAbility(auth.user, { action: "manage", resource: "menus" }),
);

const menuMetrics = computed(() => [
  {
    id: "total",
    icon: "lucide:panel-left-open",
    label: "Registered menus",
    value: String(menus.length),
    delta: "Navigation entries currently modeled in the admin shell.",
  },
  {
    id: "visible",
    icon: "lucide:eye",
    label: "Always visible",
    value: String(menus.filter((item) => item.visibility === "Visible").length),
    delta: "Core navigation entries with no extra gating.",
  },
  {
    id: "feature",
    icon: "lucide:sparkles",
    label: "Feature-gated",
    value: String(menus.filter((item) => item.visibility === "Feature-gated").length),
    delta: "Tenant capability packs decide whether these surface.",
  },
  {
    id: "role",
    icon: "lucide:shield-check",
    label: "Role-gated",
    value: String(menus.filter((item) => item.visibility === "Role-gated").length),
    delta: "Visible only to broader governance roles.",
  },
]);

const actionHighlights = computed(() => [
  { label: "Operator role", value: auth.user?.title ?? "-" },
  { label: "Feature-gated entries", value: menuMetrics.value[2]?.value ?? "0" },
  { label: "Role-gated entries", value: menuMetrics.value[3]?.value ?? "0" },
  {
    label: "Manage permission",
    value: canManageMenus.value ? "Enabled" : t("permissions.restricted"),
  },
]);

const isMenuDraftValid = computed(() => menuDraft.label.trim().length > 2);

const applyMenuDraft = () => {
  drafts.saveMenuRegistryDraft();
  isActionOpen.value = false;
};

const filteredMenus = computed(() => {
  const search = query.value.trim().toLowerCase();

  return menus.filter((menu) => {
    const matchesSearch =
      !search ||
      [menu.label, menu.group, menu.routeName, menu.visibility].some((value) =>
        value.toLowerCase().includes(search),
      );

    const matchesFilter =
      filterValue.value === "all" || menu.visibility.toLowerCase() === filterValue.value;

    const matchesView =
      activeView.value === "all" ||
      (activeView.value === "feature-gated" && menu.visibility === "Feature-gated") ||
      (activeView.value === "role-gated" && menu.visibility === "Role-gated");

    return matchesSearch && matchesFilter && matchesView;
  });
});

const filterOptions = [
  { label: "Visible", value: "visible" },
  { label: "Feature-gated", value: "feature-gated" },
  { label: "Role-gated", value: "role-gated" },
] as const;

const columns: ColumnDef<MenuRecord>[] = [
  {
    accessorKey: "label",
    header: "Menu entry",
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-3" }, [
        h(AppIcon, {
          icon: row.original.icon,
          class: "size-4 text-muted-foreground",
        }),
        h("span", { class: "font-medium" }, row.original.label),
      ]),
  },
  { accessorKey: "group", header: "Group" },
  { accessorKey: "routeName", header: "Route" },
  {
    accessorKey: "visibility",
    header: "Visibility",
    cell: ({ row }) =>
      h(
        Badge,
        {
          variant: row.original.visibility === "Visible" ? "secondary" : "outline",
          class: "rounded-full",
        },
        () => row.original.visibility,
      ),
  },
];
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('pages.menus.title')" :description="t('pages.menus.description')" />

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        v-for="metric in menuMetrics"
        :key="metric.id"
        :icon="metric.icon"
        :label="metric.label"
        :value="metric.value"
        :delta="metric.delta"
      />
    </section>

    <Card class="border-white/10 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Navigation registry posture</CardTitle>
        <CardDescription>
          Keep route labels, icons and access gates visible as the full edition grows beyond the
          starter shell.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap items-center gap-2">
        <PermissionBadge
          :allowed="canManageMenus"
          allowed-label="Menu administration enabled"
          :denied-label="t('permissions.restricted')"
        />
        <Badge variant="outline" class="rounded-full">
          Role-gated entries · {{ menus.filter((item) => item.visibility === "Role-gated").length }}
        </Badge>
        <Badge variant="outline" class="rounded-full">
          Feature-gated entries ·
          {{ menus.filter((item) => item.visibility === "Feature-gated").length }}
        </Badge>
        <Button class="rounded-full" :disabled="!canManageMenus" @click="isActionOpen = true">
          Inspect registry rules
        </Button>
        <Badge v-if="drafts.savedMenuRegistryDraft" variant="secondary" class="rounded-full">
          Draft ready · {{ drafts.savedMenuRegistryDraft.label }} /
          {{ drafts.savedMenuRegistryDraft.visibility }}
        </Badge>
        <Badge
          v-if="drafts.savedMenuRegistryDraft"
          variant="outline"
          class="rounded-full capitalize"
        >
          {{ drafts.savedMenuRegistryDraft.status }}
        </Badge>
        <Button
          v-if="drafts.savedMenuRegistryDraft"
          variant="outline"
          class="rounded-full"
          @click="drafts.updateDraftStatus('menu-registry', 'pending')"
        >
          Mark pending
        </Button>
        <Button
          v-if="drafts.savedMenuRegistryDraft"
          variant="outline"
          class="rounded-full"
          @click="drafts.clearDraftCompletely('menu-registry')"
        >
          Clear draft
        </Button>
      </CardContent>
    </Card>

    <DataTablePreview :columns="columns" :data="filteredMenus">
      <template #toolbar>
        <DataTableToolbar
          v-model:query="query"
          v-model:filter-value="filterValue"
          v-model:active-view="activeView"
          title="Menu registry"
          description="Audit navigation bindings so menu visibility stays aligned with role abilities and tenant feature packs."
          search-placeholder="Search menu, group or route..."
          total-label="menus"
          :total-count="menus.length"
          :filtered-count="filteredMenus.length"
          :filter-options="[...filterOptions]"
          :saved-views="menuViews"
        />
      </template>
    </DataTablePreview>

    <GovernanceActionDialog
      v-model:open="isActionOpen"
      title="Menu registry rule preview"
      description="Define a navigation rule draft before tying it to route metadata and access diagnostics."
      confirm-label="Save registry draft"
      :highlights="actionHighlights"
      :confirm-disabled="!isMenuDraftValid"
      @confirm="applyMenuDraft"
    >
      <label class="space-y-2 text-sm">
        <span class="text-muted-foreground">Menu label</span>
        <input
          v-model="menuDraft.label"
          class="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4 outline-none transition focus:border-primary/40"
          placeholder="Governance approvals"
        />
      </label>

      <div class="space-y-2 text-sm">
        <span class="text-muted-foreground">Visibility rule</span>
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="visibility in ['Visible', 'Feature-gated', 'Role-gated']"
            :key="visibility"
            :variant="menuDraft.visibility === visibility ? 'default' : 'outline'"
            class="rounded-full"
            @click="menuDraft.visibility = visibility"
          >
            {{ visibility }}
          </Button>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <label
          class="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/45 px-4 py-3 text-sm"
        >
          <div>
            <div class="font-medium">Tenant feature binding</div>
            <div class="text-muted-foreground">
              Explain entry visibility through tenant feature packs.
            </div>
          </div>
          <Switch v-model="menuDraft.tenantFeature" />
        </label>

        <label
          class="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/45 px-4 py-3 text-sm"
        >
          <div>
            <div class="font-medium">Role review required</div>
            <div class="text-muted-foreground">
              Flag the registry rule for permission review before publish.
            </div>
          </div>
          <Switch v-model="menuDraft.roleReview" />
        </label>
      </div>

      <div
        class="rounded-2xl border border-dashed border-primary/25 bg-primary/5 px-4 py-3 text-sm leading-6 text-muted-foreground"
      >
        Next iteration can connect this to route metadata, permission bindings, and tenant
        capability explanations.
      </div>
    </GovernanceActionDialog>
  </div>
</template>
