<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { VisArea, VisAxis, VisLine, VisXYContainer } from "@unovis/vue";
import { useRouter } from "vue-router";

import AppIcon from "@/components/AppIcon.vue";
import PageHeader from "@/components/shared/PageHeader.vue";
import PermissionBadge from "@/components/shared/PermissionBadge.vue";
import StatCard from "@/components/shared/StatCard.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartCrosshair,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
  type ChartConfig,
} from "@/components/ui/chart";
import { hasAbility } from "@/lib/access";
import { dashboardMetrics, activityFeed, tenantCapabilities, trendData } from "@/data/admin";
import { useAuthStore } from "@/stores/auth";
import { useGovernanceDraftsStore } from "@/stores/governance-drafts";
import { useTenantStore } from "@/stores/tenant";

const { t } = useI18n();
const auth = useAuthStore();
const drafts = useGovernanceDraftsStore();
const tenant = useTenantStore();
const router = useRouter();

const metrics = computed(() =>
  dashboardMetrics.map((metric) => ({ ...metric, label: t(metric.labelKey) })),
);

const permissionSummary = computed(() => [
  {
    label: "Manage tenants",
    allowed: hasAbility(auth.user, { action: "manage", resource: "tenants" }),
  },
  {
    label: "Export audit",
    allowed:
      hasAbility(auth.user, { action: "export", resource: "logs" }) &&
      tenant.hasFeature("auditExports"),
  },
  {
    label: "Workflow approvals",
    allowed: tenant.hasFeature("workflowApprovals"),
  },
]);

const governanceLaunchers = computed(() => [
  {
    title: "Review tenant matrix",
    description: "Inspect feature posture and health signals for the active tenant estate.",
    icon: "lucide:building-2",
    routeName: "tenants",
    accent: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  },
  {
    title: "Tune rollout plans",
    description: "Jump into feature governance and refine pilot versus planned capability states.",
    icon: "lucide:spline-pointer",
    routeName: "feature-matrix",
    accent: "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  },
  {
    title: "Audit permissions",
    description: "Trace high-risk actions, role coverage, and escalation posture in one place.",
    icon: "lucide:key-round",
    routeName: "permissions",
    accent: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
]);

const openGovernanceRoute = async (routeName: string) => {
  await router.push({ name: routeName });
};

const openDraftRoute = async (routeName: string) => {
  await router.push({ name: routeName });
};

const chartConfig = {
  workspaceGrowth: {
    label: "Workspace growth",
    color: "var(--chart-1)",
  },
  auditEvents: {
    label: "Audit events",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

type TrendDatum = (typeof trendData)[number];
</script>

<template>
  <div class="space-y-8">
    <PageHeader
      :eyebrow="t('dashboard.highlight')"
      :title="t('dashboard.title')"
      :description="t('dashboard.description')"
    />

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        v-for="metric in metrics"
        :key="metric.id"
        :icon="metric.icon"
        :label="metric.label"
        :value="metric.value"
        :delta="metric.delta"
      />
    </section>

    <section class="grid gap-6 xl:grid-cols-[1.5fr_0.85fr]">
      <Card
        class="overflow-hidden border-white/10 bg-card/80 shadow-[0_20px_70px_-42px_color-mix(in_oklab,var(--primary)_55%,transparent)] backdrop-blur-sm"
      >
        <CardHeader>
          <CardTitle>{{ t("dashboard.trendTitle") }}</CardTitle>
          <CardDescription>{{ t("dashboard.trendDescription") }}</CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <ChartContainer :config="chartConfig" class="min-h-[320px] w-full" cursor>
            <VisXYContainer :data="trendData">
              <VisArea
                :x="(d: TrendDatum) => d.month"
                :y="[(d: TrendDatum) => d.workspaceGrowth]"
                color="var(--chart-1)"
                :opacity="0.18"
              />
              <VisLine
                :x="(d: TrendDatum) => d.month"
                :y="[(d: TrendDatum) => d.workspaceGrowth]"
                color="var(--chart-1)"
              />
              <VisLine
                :x="(d: TrendDatum) => d.month"
                :y="[(d: TrendDatum) => d.auditEvents]"
                color="var(--chart-2)"
              />
              <VisAxis
                type="x"
                :x="(d: TrendDatum) => d.month"
                :tick-line="false"
                :domain-line="false"
                :grid-line="false"
              />
              <VisAxis type="y" :tick-line="false" :domain-line="false" :grid-line="true" />
              <ChartTooltip />
              <ChartCrosshair
                :template="
                  componentToString(chartConfig, ChartTooltipContent, {
                    labelFormatter: (value) => String(value),
                  })
                "
                :color="[chartConfig.workspaceGrowth.color, chartConfig.auditEvents.color]"
              />
            </VisXYContainer>
            <ChartLegendContent />
          </ChartContainer>
        </CardContent>
      </Card>

      <div class="space-y-6">
        <Card class="border-white/10 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{{ t("dashboard.activityTitle") }}</CardTitle>
            <CardDescription>Recent operator events, approvals and system pivots.</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <article
              v-for="item in activityFeed"
              :key="item.id"
              class="rounded-2xl border border-border/70 bg-background/35 px-4 py-3 transition hover:border-primary/35 hover:bg-primary/5"
            >
              <div class="mb-1 flex items-center justify-between gap-3">
                <div class="text-sm font-medium">{{ item.title }}</div>
                <Badge variant="secondary" class="rounded-full capitalize">{{ item.type }}</Badge>
              </div>
              <p class="text-sm leading-6 text-muted-foreground">{{ item.description }}</p>
              <div class="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground/80">
                {{ item.time }}
              </div>
            </article>
          </CardContent>
        </Card>

        <Card class="border-white/10 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{{ t("dashboard.tenantTitle") }}</CardTitle>
            <CardDescription
              >Capability scaffolding already prepared for the full edition
              roadmap.</CardDescription
            >
          </CardHeader>
          <CardContent class="space-y-3">
            <div
              v-for="capability in tenantCapabilities"
              :key="capability.name"
              class="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/35 px-4 py-3"
            >
              <div class="flex items-center gap-3 text-sm font-medium">
                <AppIcon icon="lucide:sparkles" class="size-4 text-primary" />
                {{ capability.name }}
              </div>
              <Badge
                variant="outline"
                class="rounded-full border-primary/25 bg-primary/5 text-primary"
                >{{ capability.status }}</Badge
              >
            </div>
          </CardContent>
        </Card>

        <Card class="border-white/10 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Access matrix</CardTitle>
            <CardDescription>
              Current role abilities resolved against the active tenant feature pack.
            </CardDescription>
          </CardHeader>
          <CardContent class="flex flex-wrap gap-2">
            <PermissionBadge
              v-for="entry in permissionSummary"
              :key="entry.label"
              :allowed="entry.allowed"
              :allowed-label="entry.label"
              :denied-label="`${entry.label} · ${t('permissions.restricted')}`"
            />
          </CardContent>
        </Card>

        <Card class="border-white/10 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Governance jumpboard</CardTitle>
            <CardDescription>
              Fast links into the most active governance surfaces for the Full edition shell.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <article
              v-for="item in governanceLaunchers"
              :key="item.routeName"
              class="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/35 px-4 py-4"
            >
              <div class="flex items-start gap-3">
                <div class="rounded-2xl border px-2.5 py-2" :class="item.accent">
                  <AppIcon :icon="item.icon" class="size-4" />
                </div>
                <div class="space-y-1">
                  <div class="text-sm font-medium">{{ item.title }}</div>
                  <p class="max-w-xs text-sm leading-6 text-muted-foreground">
                    {{ item.description }}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                class="rounded-full"
                @click="openGovernanceRoute(item.routeName)"
              >
                Open
              </Button>
            </article>
          </CardContent>
        </Card>

        <Card class="border-white/10 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Draft center</CardTitle>
            <CardDescription>
              Cross-page governance drafts now persist in store so operators can resume work later.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <div class="flex flex-wrap gap-2">
              <Badge variant="secondary" class="rounded-full">
                Saved drafts · {{ drafts.savedDraftCount }}
              </Badge>
              <Badge variant="outline" class="rounded-full">
                Draft · {{ drafts.statusCounts.draft }}
              </Badge>
              <Badge variant="outline" class="rounded-full">
                Pending · {{ drafts.statusCounts.pending }}
              </Badge>
              <Badge variant="outline" class="rounded-full">
                Published · {{ drafts.statusCounts.published }}
              </Badge>
              <Badge variant="outline" class="rounded-full">
                Tenant context · {{ tenant.currentTenant?.name }}
              </Badge>
            </div>

            <article
              v-for="item in drafts.savedDraftSummaries"
              :key="item.id"
              class="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/35 px-4 py-4"
            >
              <div class="flex items-start gap-3">
                <div
                  class="rounded-2xl border border-primary/20 bg-primary/10 px-2.5 py-2 text-primary"
                >
                  <AppIcon :icon="item.icon" class="size-4" />
                </div>
                <div class="space-y-1">
                  <div class="text-sm font-medium">{{ item.title }}</div>
                  <div class="text-sm text-muted-foreground">{{ item.detail }}</div>
                  <div class="flex items-center gap-2">
                    <Badge variant="outline" class="rounded-full capitalize">
                      {{ item.status }}
                    </Badge>
                  </div>
                  <div class="text-xs uppercase tracking-[0.14em] text-muted-foreground/80">
                    {{ item.updatedAt.replace("T", " ").slice(0, 16) }}
                  </div>
                </div>
              </div>
              <div class="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  class="rounded-full"
                  @click="openDraftRoute(item.routeName)"
                >
                  Resume
                </Button>
                <Button
                  variant="outline"
                  class="rounded-full"
                  @click="drafts.updateDraftStatus(item.id, 'pending')"
                >
                  Mark pending
                </Button>
                <Button
                  variant="outline"
                  class="rounded-full"
                  @click="drafts.updateDraftStatus(item.id, 'published')"
                >
                  Publish
                </Button>
                <Button
                  variant="outline"
                  class="rounded-full"
                  @click="drafts.clearDraftCompletely(item.id)"
                >
                  Clear
                </Button>
              </div>
            </article>

            <div
              v-if="!drafts.savedDraftSummaries.length"
              class="rounded-2xl border border-dashed border-border/70 bg-background/35 px-4 py-4 text-sm text-muted-foreground"
            >
              No governance drafts saved yet. Create a workspace, rollout, permission, or menu draft
              to populate this center.
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  </div>
</template>
