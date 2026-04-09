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
import { permissionViews, permissions } from "@/data/admin";
import { hasAbility } from "@/lib/access";
import { useAuthStore } from "@/stores/auth";
import { useGovernanceDraftsStore } from "@/stores/governance-drafts";

type PermissionRecord = (typeof permissions)[number];

const { t } = useI18n();
const auth = useAuthStore();
const drafts = useGovernanceDraftsStore();
const query = ref("");
const filterValue = ref("all");
const activeView = ref("all");
const isActionOpen = ref(false);

const policyDraft = drafts.permissionPolicyDraft;

const canManagePermissions = computed(() =>
  hasAbility(auth.user, { action: "manage", resource: "permissions" }),
);

const permissionMetrics = computed(() => [
  {
    id: "total",
    icon: "lucide:key-round",
    label: "Permission points",
    value: String(permissions.length),
    delta: "Seeded ability records across governance surfaces.",
  },
  {
    id: "high",
    icon: "lucide:shield-alert",
    label: "High-risk actions",
    value: String(permissions.filter((item) => item.risk === "High").length),
    delta: "Sensitive actions that deserve explicit review.",
  },
  {
    id: "single",
    icon: "lucide:user-round-lock",
    label: "Single-role coverage",
    value: String(permissions.filter((item) => item.roles.length <= 1).length),
    delta: "Narrowly assigned controls that may become bottlenecks.",
  },
  {
    id: "areas",
    icon: "lucide:folders",
    label: "Governance areas",
    value: String(new Set(permissions.map((item) => item.area)).size),
    delta: "Identity, configuration and navigation touchpoints.",
  },
]);

const actionHighlights = computed(() => [
  { label: "Active role", value: auth.user?.title ?? "-" },
  { label: "High-risk actions", value: permissionMetrics.value[1]?.value ?? "0" },
  { label: "Single-role coverage", value: permissionMetrics.value[2]?.value ?? "0" },
  {
    label: "Manage permission",
    value: canManagePermissions.value ? "Enabled" : t("permissions.restricted"),
  },
]);

const isPolicyDraftValid = computed(() => policyDraft.name.trim().length > 2);

const applyPolicyDraft = () => {
  drafts.savePermissionPolicyDraft();
  isActionOpen.value = false;
};

const filteredPermissions = computed(() => {
  const search = query.value.trim().toLowerCase();

  return permissions.filter((permission) => {
    const matchesSearch =
      !search ||
      [permission.area, permission.action, permission.resource, ...permission.roles].some((value) =>
        value.toLowerCase().includes(search),
      );

    const matchesFilter =
      filterValue.value === "all" || permission.risk.toLowerCase() === filterValue.value;

    const matchesView =
      activeView.value === "all" ||
      (activeView.value === "high-risk" && permission.risk === "High") ||
      (activeView.value === "role-gaps" && permission.roles.length <= 1);

    return matchesSearch && matchesFilter && matchesView;
  });
});

const filterOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
] as const;

const columns: ColumnDef<PermissionRecord>[] = [
  { accessorKey: "area", header: "Area" },
  { accessorKey: "action", header: "Action" },
  { accessorKey: "resource", header: "Resource" },
  {
    accessorKey: "roles",
    header: "Assigned roles",
    cell: ({ row }) => row.original.roles.join(", "),
  },
  {
    accessorKey: "risk",
    header: "Risk",
    cell: ({ row }) =>
      h(
        Badge,
        {
          variant: row.original.risk === "Low" ? "secondary" : "outline",
          class:
            row.original.risk === "High"
              ? "rounded-full border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300"
              : "rounded-full",
        },
        () => row.original.risk,
      ),
  },
];
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="t('pages.permissions.title')"
      :description="t('pages.permissions.description')"
    />

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        v-for="metric in permissionMetrics"
        :key="metric.id"
        :icon="metric.icon"
        :label="metric.label"
        :value="metric.value"
        :delta="metric.delta"
      />
    </section>

    <Card class="border-white/10 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Ability coverage posture</CardTitle>
        <CardDescription>
          Review sensitive action points before replacing seeded role rules with a policy engine.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap items-center gap-2">
        <PermissionBadge
          :allowed="canManagePermissions"
          allowed-label="Permission administration enabled"
          :denied-label="t('permissions.restricted')"
        />
        <Badge variant="outline" class="rounded-full"> Active role · {{ auth.user?.title }} </Badge>
        <Badge variant="outline" class="rounded-full">
          High-risk points · {{ permissions.filter((item) => item.risk === "High").length }}
        </Badge>
        <Button class="rounded-full" :disabled="!canManagePermissions" @click="isActionOpen = true">
          Review escalation policy
        </Button>
        <Badge v-if="drafts.savedPermissionPolicyDraft" variant="secondary" class="rounded-full">
          Draft ready · {{ drafts.savedPermissionPolicyDraft.name }} /
          {{ drafts.savedPermissionPolicyDraft.targetRisk }}
        </Badge>
        <Badge
          v-if="drafts.savedPermissionPolicyDraft"
          variant="outline"
          class="rounded-full capitalize"
        >
          {{ drafts.savedPermissionPolicyDraft.status }}
        </Badge>
        <Button
          v-if="drafts.savedPermissionPolicyDraft"
          variant="outline"
          class="rounded-full"
          @click="drafts.updateDraftStatus('permission-policy', 'pending')"
        >
          Mark pending
        </Button>
        <Button
          v-if="drafts.savedPermissionPolicyDraft"
          variant="outline"
          class="rounded-full"
          @click="drafts.clearDraftCompletely('permission-policy')"
        >
          Clear draft
        </Button>
      </CardContent>
    </Card>

    <DataTablePreview :columns="columns" :data="filteredPermissions">
      <template #toolbar>
        <DataTableToolbar
          v-model:query="query"
          v-model:filter-value="filterValue"
          v-model:active-view="activeView"
          title="Permission registry"
          description="Search ability records by area, action and risk to understand how far the seeded governance model already reaches."
          search-placeholder="Search area, action, resource or role..."
          total-label="permissions"
          :total-count="permissions.length"
          :filtered-count="filteredPermissions.length"
          :filter-options="[...filterOptions]"
          :saved-views="permissionViews"
        />
      </template>
    </DataTablePreview>

    <GovernanceActionDialog
      v-model:open="isActionOpen"
      title="Escalation policy preview"
      description="Define a lightweight escalation policy draft before wiring it to a real policy engine."
      confirm-label="Save policy draft"
      :highlights="actionHighlights"
      :confirm-disabled="!isPolicyDraftValid"
      @confirm="applyPolicyDraft"
    >
      <label class="space-y-2 text-sm">
        <span class="text-muted-foreground">Policy name</span>
        <input
          v-model="policyDraft.name"
          class="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4 outline-none transition focus:border-primary/40"
          placeholder="Privileged action review"
        />
      </label>

      <div class="space-y-2 text-sm">
        <span class="text-muted-foreground">Target risk band</span>
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="risk in ['Low', 'Medium', 'High']"
            :key="risk"
            :variant="policyDraft.targetRisk === risk ? 'default' : 'outline'"
            class="rounded-full"
            @click="policyDraft.targetRisk = risk"
          >
            {{ risk }}
          </Button>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <label
          class="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/45 px-4 py-3 text-sm"
        >
          <div>
            <div class="font-medium">Dual approval</div>
            <div class="text-muted-foreground">
              Require two approvers for targeted risk actions.
            </div>
          </div>
          <Switch v-model="policyDraft.dualApproval" />
        </label>

        <label
          class="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/45 px-4 py-3 text-sm"
        >
          <div>
            <div class="font-medium">Audit trace</div>
            <div class="text-muted-foreground">
              Persist review events for later export and replay.
            </div>
          </div>
          <Switch v-model="policyDraft.auditTrace" />
        </label>
      </div>

      <div
        class="rounded-2xl border border-dashed border-primary/25 bg-primary/5 px-4 py-3 text-sm leading-6 text-muted-foreground"
      >
        Next pass can attach approver groups, policy versions, and change history to each high-risk
        permission.
      </div>
    </GovernanceActionDialog>
  </div>
</template>
