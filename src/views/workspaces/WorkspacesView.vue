<script setup lang="ts">
import type { ColumnDef } from "@tanstack/vue-table";
import { computed, h, ref } from "vue";
import { useI18n } from "vue-i18n";

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
import { tenants, workspaceViews, workspaces } from "@/data/admin";
import { hasAbility } from "@/lib/access";
import { useAuthStore } from "@/stores/auth";
import { useGovernanceDraftsStore } from "@/stores/governance-drafts";
import { useTenantStore } from "@/stores/tenant";

type WorkspaceRecord = (typeof workspaces)[number];

const { t } = useI18n();
const auth = useAuthStore();
const drafts = useGovernanceDraftsStore();
const tenant = useTenantStore();
const query = ref("");
const filterValue = ref("all");
const activeView = ref("all");
const isActionOpen = ref(false);

const workspaceDraft = drafts.workspaceDraft;

const tenantNameById = Object.fromEntries(tenants.map((item) => [item.id, item.name]));

const canManageWorkspaces = computed(() =>
  hasAbility(auth.user, { action: "manage", resource: "workspaces" }),
);

const workspaceMetrics = computed(() => [
  {
    id: "total",
    icon: "lucide:layers-3",
    label: "Workspace zones",
    value: String(workspaces.length),
    delta: "Tenant-aware operator surfaces across the seeded estate.",
  },
  {
    id: "production",
    icon: "lucide:shield-check",
    label: "Production zones",
    value: String(workspaces.filter((item) => item.environment === "Production").length),
    delta: "Live environments that deserve tighter governance posture.",
  },
  {
    id: "non-prod",
    icon: "lucide:flask-conical",
    label: "Pilot environments",
    value: String(workspaces.filter((item) => item.environment !== "Production").length),
    delta: "Staging and sandbox spaces for rollout rehearsal.",
  },
  {
    id: "members",
    icon: "lucide:users-round",
    label: "Workspace members",
    value: String(workspaces.reduce((sum, item) => sum + item.members, 0)),
    delta: "Total operator footprint across all workspace scopes.",
  },
]);

const actionHighlights = computed(() => [
  { label: "Current tenant", value: tenant.currentTenant?.name ?? "-" },
  { label: "Available workspaces", value: String(tenant.availableWorkspaces.length) },
  { label: "Operator role", value: auth.user?.title ?? "-" },
  {
    label: "Manage permission",
    value: canManageWorkspaces.value ? "Enabled" : t("permissions.restricted"),
  },
]);

const isWorkspaceDraftValid = computed(
  () => workspaceDraft.name.trim().length > 1 && workspaceDraft.region.trim().length > 1,
);

const applyWorkspaceDraft = () => {
  drafts.saveWorkspaceDraft();
  isActionOpen.value = false;
};

const filteredWorkspaces = computed(() => {
  const search = query.value.trim().toLowerCase();

  return workspaces.filter((workspace) => {
    const tenantName = tenantNameById[workspace.tenantId] ?? workspace.tenantId;
    const matchesSearch =
      !search ||
      [workspace.name, workspace.environment, workspace.region, tenantName].some((value) =>
        value.toLowerCase().includes(search),
      );

    const matchesFilter =
      filterValue.value === "all" || workspace.environment.toLowerCase() === filterValue.value;

    const matchesView =
      activeView.value === "all" ||
      (activeView.value === "production-only" && workspace.environment === "Production") ||
      (activeView.value === "pilot-zones" &&
        ["Staging", "Sandbox"].includes(workspace.environment));

    return matchesSearch && matchesFilter && matchesView;
  });
});

const filterOptions = [
  { label: "Production", value: "production" },
  { label: "Staging", value: "staging" },
  { label: "Sandbox", value: "sandbox" },
] as const;

const columns: ColumnDef<WorkspaceRecord>[] = [
  { accessorKey: "name", header: "Workspace" },
  {
    id: "tenant",
    header: "Tenant",
    cell: ({ row }) => tenantNameById[row.original.tenantId] ?? row.original.tenantId,
  },
  {
    accessorKey: "environment",
    header: "Environment",
    cell: ({ row }) =>
      h(
        Badge,
        {
          variant: row.original.environment === "Production" ? "secondary" : "outline",
          class: "rounded-full",
        },
        () => row.original.environment,
      ),
  },
  { accessorKey: "region", header: "Region" },
  { accessorKey: "members", header: "Members" },
];
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="t('pages.workspaces.title')"
      :description="t('pages.workspaces.description')"
    />

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        v-for="metric in workspaceMetrics"
        :key="metric.id"
        :icon="metric.icon"
        :label="metric.label"
        :value="metric.value"
        :delta="metric.delta"
      />
    </section>

    <Card class="border-white/10 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Workspace control surface</CardTitle>
        <CardDescription>
          Track environment zones per tenant before connecting lifecycle actions to a live backend.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap items-center gap-2">
        <PermissionBadge
          :allowed="canManageWorkspaces"
          allowed-label="Workspace administration enabled"
          :denied-label="t('permissions.restricted')"
        />
        <Badge variant="outline" class="rounded-full">
          {{ t("common.tenant") }} · {{ tenant.currentTenant?.name }}
        </Badge>
        <Badge variant="outline" class="rounded-full">
          {{ t("common.workspace") }} · {{ tenant.currentWorkspace?.name }}
        </Badge>
        <Button class="rounded-full" :disabled="!canManageWorkspaces" @click="isActionOpen = true">
          Create workspace blueprint
        </Button>
        <Badge v-if="drafts.savedWorkspaceDraft" variant="secondary" class="rounded-full">
          Draft ready · {{ drafts.savedWorkspaceDraft.name }} /
          {{ drafts.savedWorkspaceDraft.environment }}
        </Badge>
        <Badge v-if="drafts.savedWorkspaceDraft" variant="outline" class="rounded-full capitalize">
          {{ drafts.savedWorkspaceDraft.status }}
        </Badge>
        <Button
          v-if="drafts.savedWorkspaceDraft"
          variant="outline"
          class="rounded-full"
          @click="drafts.updateDraftStatus('workspace', 'pending')"
        >
          Mark pending
        </Button>
        <Button
          v-if="drafts.savedWorkspaceDraft"
          variant="outline"
          class="rounded-full"
          @click="drafts.clearDraftCompletely('workspace')"
        >
          Clear draft
        </Button>
      </CardContent>
    </Card>

    <DataTablePreview :columns="columns" :data="filteredWorkspaces">
      <template #toolbar>
        <DataTableToolbar
          v-model:query="query"
          v-model:filter-value="filterValue"
          v-model:active-view="activeView"
          title="Workspace estate"
          description="Search tenants, environments and regions to understand how the full edition partitions operator zones."
          search-placeholder="Search workspace, tenant or region..."
          total-label="workspaces"
          :total-count="workspaces.length"
          :filtered-count="filteredWorkspaces.length"
          :filter-options="[...filterOptions]"
          :saved-views="workspaceViews"
        />
      </template>
    </DataTablePreview>

    <GovernanceActionDialog
      v-model:open="isActionOpen"
      title="Workspace blueprint preview"
      description="Capture the first layer of workspace provisioning input before connecting this flow to backend automation."
      confirm-label="Save blueprint draft"
      :highlights="actionHighlights"
      :confirm-disabled="!isWorkspaceDraftValid"
      @confirm="applyWorkspaceDraft"
    >
      <div class="grid gap-4 md:grid-cols-2">
        <label class="space-y-2 text-sm">
          <span class="text-muted-foreground">Workspace name</span>
          <input
            v-model="workspaceDraft.name"
            class="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4 outline-none transition focus:border-primary/40"
            placeholder="Core Finance Ops"
          />
        </label>
        <label class="space-y-2 text-sm">
          <span class="text-muted-foreground">Region</span>
          <input
            v-model="workspaceDraft.region"
            class="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4 outline-none transition focus:border-primary/40"
            placeholder="Singapore"
          />
        </label>
      </div>

      <div class="space-y-2 text-sm">
        <span class="text-muted-foreground">Environment</span>
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="environment in ['Production', 'Staging', 'Sandbox']"
            :key="environment"
            :variant="workspaceDraft.environment === environment ? 'default' : 'outline'"
            class="rounded-full"
            @click="workspaceDraft.environment = environment"
          >
            {{ environment }}
          </Button>
        </div>
      </div>

      <label
        class="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/45 px-4 py-3 text-sm"
      >
        <div>
          <div class="font-medium">Inherit approval defaults</div>
          <div class="text-muted-foreground">
            Carry tenant workflow approvals into the new workspace blueprint.
          </div>
        </div>
        <Switch v-model="workspaceDraft.inheritApprovals" />
      </label>

      <div
        class="rounded-2xl border border-dashed border-primary/25 bg-primary/5 px-4 py-3 text-sm leading-6 text-muted-foreground"
      >
        Next implementation pass can turn this into a proper provisioning wizard with feature-pack
        inheritance and policy templates.
      </div>
    </GovernanceActionDialog>
  </div>
</template>
