<script setup lang="ts">
import type { ColumnDef } from "@tanstack/vue-table";
import { computed, h, ref } from "vue";
import { useI18n } from "vue-i18n";

import DataTablePreview from "@/components/shared/DataTablePreview.vue";
import DataTableToolbar from "@/components/shared/DataTableToolbar.vue";
import PageHeader from "@/components/shared/PageHeader.vue";
import PermissionBadge from "@/components/shared/PermissionBadge.vue";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { savedViews, tenantCapabilities, tenants } from "@/data/admin";
import { hasAbility } from "@/lib/access";
import { useAuthStore } from "@/stores/auth";
import { useTenantStore } from "@/stores/tenant";

type TenantRecord = (typeof tenants)[number];

const { t } = useI18n();
const auth = useAuthStore();
const tenant = useTenantStore();
const query = ref("");
const filterValue = ref("all");
const activeView = ref("all");

const capabilityRows = computed(() => {
  return tenantCapabilities.map((item) => ({
    ...item,
    currentStatus: tenant.currentTenant?.capabilities[item.key] ?? "disabled",
  }));
});

const canManageTenants = computed(() =>
  hasAbility(auth.user, { action: "manage", resource: "tenants" }),
);

const filteredTenants = computed(() => {
  const search = query.value.trim().toLowerCase();

  return tenants.filter((tenant) => {
    const matchesSearch =
      !search ||
      [tenant.name, tenant.plan, tenant.region].some((value) =>
        value.toLowerCase().includes(search),
      );

    const matchesFilter =
      filterValue.value === "all" ||
      tenant.status.toLowerCase() === filterValue.value ||
      tenant.plan.toLowerCase().includes(filterValue.value);

    const matchesView =
      activeView.value === "all" ||
      (activeView.value === "enterprise-only" && tenant.plan.includes("Enterprise")) ||
      (activeView.value === "needs-attention" && tenant.status === "Attention");

    return matchesSearch && matchesFilter && matchesView;
  });
});

const filterOptions = [
  { label: "Healthy", value: "healthy" },
  { label: "Attention", value: "attention" },
  { label: "Enterprise plan", value: "enterprise" },
] as const;

const columns: ColumnDef<TenantRecord>[] = [
  { accessorKey: "name", header: "Tenant" },
  { accessorKey: "plan", header: "Plan" },
  { accessorKey: "region", header: "Region" },
  { accessorKey: "members", header: "Members" },
  {
    accessorKey: "status",
    header: "Health",
    cell: ({ row }) =>
      h(
        Badge,
        {
          variant: row.original.status === "Healthy" ? "secondary" : "outline",
          class:
            row.original.status === "Healthy"
              ? "rounded-full"
              : "rounded-full border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300",
        },
        () => row.original.status,
      ),
  },
];
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('pages.tenants.title')" :description="t('pages.tenants.description')" />

    <Card class="border-white/10 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Active tenant feature matrix</CardTitle>
        <CardDescription>
          Feature states are now workspace-aware and can gate routes, actions and tenant operations.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <PermissionBadge
            :allowed="canManageTenants"
            allowed-label="Tenant administration enabled"
            :denied-label="t('permissions.restricted')"
          />
          <Badge variant="outline" class="rounded-full">
            {{ t("common.workspace") }} · {{ tenant.currentWorkspace?.name }}
          </Badge>
        </div>
        <div class="grid gap-3 md:grid-cols-2">
          <div
            v-for="capability in capabilityRows"
            :key="capability.key"
            class="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/35 px-4 py-3"
          >
            <div>
              <div class="text-sm font-medium">{{ capability.name }}</div>
              <div class="text-xs text-muted-foreground">Current tenant capability resolution</div>
            </div>
            <Badge
              :variant="capability.currentStatus === 'enabled' ? 'secondary' : 'outline'"
              class="rounded-full capitalize"
            >
              {{ capability.currentStatus }}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>

    <DataTablePreview :columns="columns" :data="filteredTenants">
      <template #toolbar>
        <DataTableToolbar
          v-model:query="query"
          v-model:filter-value="filterValue"
          v-model:active-view="activeView"
          title="Tenant capability matrix"
          description="Search and slice the multi-tenant estate before wiring it to a real backend capability service."
          search-placeholder="Search tenant, plan or region..."
          total-label="tenants"
          :total-count="tenants.length"
          :filtered-count="filteredTenants.length"
          :filter-options="[...filterOptions]"
          :saved-views="savedViews.tenants"
        />
      </template>
    </DataTablePreview>
  </div>
</template>
