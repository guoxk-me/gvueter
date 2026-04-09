<script setup lang="ts">
import type { ColumnDef } from "@tanstack/vue-table";
import { computed, h, ref } from "vue";
import { useI18n } from "vue-i18n";
import { VisAxis, VisLine, VisXYContainer } from "@unovis/vue";

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
import {
  ChartContainer,
  ChartCrosshair,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
  type ChartConfig,
} from "@/components/ui/chart";
import { tenantCapabilities, tenants } from "@/data/admin";
import { hasAbility, type TenantFeatureKey } from "@/lib/access";
import { useAuthStore } from "@/stores/auth";
import { useGovernanceDraftsStore } from "@/stores/governance-drafts";
import { useTenantStore } from "@/stores/tenant";

type FeatureMatrixRow = {
  id: string;
  tenant: string;
  plan: string;
  capability: string;
  key: TenantFeatureKey;
  status: string;
};

type TenantTrendDatum = {
  tenant: string;
  enabled: number;
  pilot: number;
  planned: number;
};

const { t } = useI18n();
const auth = useAuthStore();
const drafts = useGovernanceDraftsStore();
const tenantStore = useTenantStore();
const query = ref("");
const filterValue = ref("all");
const activeView = ref("all");
const isActionOpen = ref(false);

const rolloutDraft = drafts.featureRolloutDraft;

const capabilityNameByKey = Object.fromEntries(
  tenantCapabilities.map((item) => [item.key, item.name]),
);

const canConfigureFeatures = computed(() =>
  hasAbility(auth.user, { action: "configure", resource: "featureMatrix" }),
);

const matrixRows = computed<FeatureMatrixRow[]>(() => {
  return tenants.flatMap((tenant) =>
    Object.entries(tenant.capabilities).map(([key, status]) => ({
      id: `${tenant.id}-${key}`,
      tenant: tenant.name,
      plan: tenant.plan,
      capability: capabilityNameByKey[key as TenantFeatureKey] ?? key,
      key: key as TenantFeatureKey,
      status,
    })),
  );
});

const featureMetrics = computed(() => {
  const statusCounts = matrixRows.value.reduce(
    (acc, row) => {
      acc[row.status as keyof typeof acc] += 1;
      return acc;
    },
    { enabled: 0, pilot: 0, planned: 0, disabled: 0 },
  );

  return [
    {
      id: "enabled",
      icon: "lucide:badge-check",
      label: "Enabled states",
      value: String(statusCounts.enabled),
      delta: "Capability packs already exposed to tenants now.",
    },
    {
      id: "pilot",
      icon: "lucide:rocket",
      label: "Pilot states",
      value: String(statusCounts.pilot),
      delta: "Controlled rollout items under validation.",
    },
    {
      id: "planned",
      icon: "lucide:calendar-range",
      label: "Planned states",
      value: String(statusCounts.planned),
      delta: "Forward roadmap capability slots.",
    },
    {
      id: "tenants",
      icon: "lucide:building-2",
      label: "Governed tenants",
      value: String(tenants.length),
      delta: "Front-end abstraction remains backend-agnostic.",
    },
  ];
});

const tenantTrendData = computed<TenantTrendDatum[]>(() => {
  return tenants.map((tenant) => {
    const statuses = Object.values(tenant.capabilities);

    return {
      tenant: tenant.name,
      enabled: statuses.filter((status) => status === "enabled").length,
      pilot: statuses.filter((status) => status === "pilot").length,
      planned: statuses.filter((status) => status === "planned").length,
    };
  });
});

const chartConfig = {
  enabled: {
    label: "Enabled",
    color: "var(--chart-1)",
  },
  pilot: {
    label: "Pilot",
    color: "var(--chart-2)",
  },
  planned: {
    label: "Planned",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const actionHighlights = computed(() => [
  { label: "Current tenant", value: tenantStore.currentTenant?.name ?? "-" },
  { label: "Feature states", value: String(matrixRows.value.length) },
  { label: "Pilot entries", value: featureMetrics.value[1]?.value ?? "0" },
  {
    label: "Configure permission",
    value: canConfigureFeatures.value ? "Enabled" : t("permissions.restricted"),
  },
]);

const isRolloutDraftValid = computed(() => rolloutDraft.label.trim().length > 2);

const applyRolloutDraft = () => {
  drafts.saveFeatureRolloutDraft();
  isActionOpen.value = false;
};

const filteredRows = computed(() => {
  const search = query.value.trim().toLowerCase();

  return matrixRows.value.filter((row) => {
    const matchesSearch =
      !search ||
      [row.tenant, row.plan, row.capability, row.status].some((value) =>
        value.toLowerCase().includes(search),
      );

    const matchesFilter = filterValue.value === "all" || row.status === filterValue.value;

    const matchesView =
      activeView.value === "all" ||
      (activeView.value === "enabled-only" && row.status === "enabled") ||
      (activeView.value === "delivery-roadmap" && ["pilot", "planned"].includes(row.status));

    return matchesSearch && matchesFilter && matchesView;
  });
});

const filterOptions = [
  { label: "Enabled", value: "enabled" },
  { label: "Pilot", value: "pilot" },
  { label: "Planned", value: "planned" },
  { label: "Disabled", value: "disabled" },
] as const;

const featureViews = [
  {
    id: "enabled-only",
    label: "Enabled Only",
    description: "Live capability packs already visible in production tenant flows.",
  },
  {
    id: "delivery-roadmap",
    label: "Delivery Roadmap",
    description: "Pilot and planned items that still need rollout governance.",
  },
] as const;

const columns: ColumnDef<FeatureMatrixRow>[] = [
  { accessorKey: "tenant", header: "Tenant" },
  { accessorKey: "plan", header: "Plan" },
  { accessorKey: "capability", header: "Capability" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) =>
      h(
        Badge,
        {
          variant: row.original.status === "enabled" ? "secondary" : "outline",
          class: "rounded-full capitalize",
        },
        () => row.original.status,
      ),
  },
];
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="t('pages.featureMatrix.title')"
      :description="t('pages.featureMatrix.description')"
    />

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        v-for="metric in featureMetrics"
        :key="metric.id"
        :icon="metric.icon"
        :label="metric.label"
        :value="metric.value"
        :delta="metric.delta"
      />
    </section>

    <Card class="border-white/10 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Tenant capability governance</CardTitle>
        <CardDescription>
          Feature state is modeled separately from backend implementation so the frontend stays
          portable.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap items-center gap-2">
        <PermissionBadge
          :allowed="canConfigureFeatures"
          allowed-label="Feature governance enabled"
          :denied-label="t('permissions.restricted')"
        />
        <Badge variant="outline" class="rounded-full capitalize">
          Current tenant · {{ tenantStore.currentTenant?.name }}
        </Badge>
        <Badge variant="outline" class="rounded-full capitalize">
          Workspace switching · {{ tenantStore.featureStatus("workspaceSwitching") }}
        </Badge>
        <Button class="rounded-full" :disabled="!canConfigureFeatures" @click="isActionOpen = true">
          Open rollout review
        </Button>
        <Badge
          v-if="drafts.savedFeatureRolloutDraft"
          variant="secondary"
          class="rounded-full capitalize"
        >
          Draft ready · {{ drafts.savedFeatureRolloutDraft.label }} /
          {{ drafts.savedFeatureRolloutDraft.mode }}
        </Badge>
        <Badge
          v-if="drafts.savedFeatureRolloutDraft"
          variant="outline"
          class="rounded-full capitalize"
        >
          {{ drafts.savedFeatureRolloutDraft.status }}
        </Badge>
        <Button
          v-if="drafts.savedFeatureRolloutDraft"
          variant="outline"
          class="rounded-full"
          @click="drafts.updateDraftStatus('feature-rollout', 'pending')"
        >
          Mark pending
        </Button>
        <Button
          v-if="drafts.savedFeatureRolloutDraft"
          variant="outline"
          class="rounded-full"
          @click="drafts.clearDraftCompletely('feature-rollout')"
        >
          Clear draft
        </Button>
      </CardContent>
    </Card>

    <Card
      class="overflow-hidden border-white/10 bg-card/80 shadow-[0_20px_70px_-42px_color-mix(in_oklab,var(--primary)_55%,transparent)] backdrop-blur-sm"
    >
      <CardHeader>
        <CardTitle>Rollout distribution by tenant</CardTitle>
        <CardDescription>
          A quick visual read of enabled, pilot and planned capability depth across the seeded
          tenants.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer :config="chartConfig" class="min-h-[280px] w-full" cursor>
          <VisXYContainer :data="tenantTrendData">
            <VisLine
              :x="(d: TenantTrendDatum) => d.tenant"
              :y="[(d: TenantTrendDatum) => d.enabled]"
              color="var(--chart-1)"
            />
            <VisLine
              :x="(d: TenantTrendDatum) => d.tenant"
              :y="[(d: TenantTrendDatum) => d.pilot]"
              color="var(--chart-2)"
            />
            <VisLine
              :x="(d: TenantTrendDatum) => d.tenant"
              :y="[(d: TenantTrendDatum) => d.planned]"
              color="var(--chart-3)"
            />
            <VisAxis
              type="x"
              :x="(d: TenantTrendDatum) => d.tenant"
              :tick-line="false"
              :domain-line="false"
              :grid-line="false"
            />
            <VisAxis type="y" :tick-line="false" :domain-line="false" :grid-line="true" />
            <ChartTooltip />
            <ChartCrosshair
              :template="componentToString(chartConfig, ChartTooltipContent)"
              :color="[
                chartConfig.enabled.color,
                chartConfig.pilot.color,
                chartConfig.planned.color,
              ]"
            />
          </VisXYContainer>
          <ChartLegendContent />
        </ChartContainer>
      </CardContent>
    </Card>

    <DataTablePreview :columns="columns" :data="filteredRows">
      <template #toolbar>
        <DataTableToolbar
          v-model:query="query"
          v-model:filter-value="filterValue"
          v-model:active-view="activeView"
          title="Capability rollout matrix"
          description="Compare tenant plans against capability status before wiring these toggles to a concrete product backend."
          search-placeholder="Search tenant, plan or capability..."
          total-label="feature states"
          :total-count="matrixRows.length"
          :filtered-count="filteredRows.length"
          :filter-options="[...filterOptions]"
          :saved-views="[...featureViews]"
        />
      </template>
    </DataTablePreview>

    <GovernanceActionDialog
      v-model:open="isActionOpen"
      title="Feature rollout review"
      description="Shape a rollout draft that can later be attached to approvals, notes and tenant exceptions."
      confirm-label="Save rollout draft"
      :highlights="actionHighlights"
      :confirm-disabled="!isRolloutDraftValid"
      @confirm="applyRolloutDraft"
    >
      <label class="space-y-2 text-sm">
        <span class="text-muted-foreground">Rollout label</span>
        <input
          v-model="rolloutDraft.label"
          class="h-11 w-full rounded-2xl border border-border/70 bg-background/60 px-4 outline-none transition focus:border-primary/40"
          placeholder="Q2 pilot rollout"
        />
      </label>

      <div class="space-y-2 text-sm">
        <span class="text-muted-foreground">Rollout mode</span>
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="mode in ['enabled', 'pilot', 'planned']"
            :key="mode"
            :variant="rolloutDraft.mode === mode ? 'default' : 'outline'"
            class="rounded-full capitalize"
            @click="rolloutDraft.mode = mode"
          >
            {{ mode }}
          </Button>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <label
          class="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/45 px-4 py-3 text-sm"
        >
          <div>
            <div class="font-medium">Workspace guardrails</div>
            <div class="text-muted-foreground">
              Require workspace-level checks before rollout expansion.
            </div>
          </div>
          <Switch v-model="rolloutDraft.workspaceGuard" />
        </label>

        <label
          class="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/45 px-4 py-3 text-sm"
        >
          <div>
            <div class="font-medium">Notify owners</div>
            <div class="text-muted-foreground">Ping tenant owners when rollout state changes.</div>
          </div>
          <Switch v-model="rolloutDraft.notifyOwners" />
        </label>
      </div>

      <div
        class="rounded-2xl border border-dashed border-primary/25 bg-primary/5 px-4 py-3 text-sm leading-6 text-muted-foreground"
      >
        Recommended next layer: tenant-level override history, approval owners, and rollout notes
        per feature pack.
      </div>
    </GovernanceActionDialog>
  </div>
</template>
