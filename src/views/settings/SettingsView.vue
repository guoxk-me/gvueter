<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import PermissionBadge from "@/components/shared/PermissionBadge.vue";
import ThemeStudio from "@/components/shared/ThemeStudio.vue";
import PageHeader from "@/components/shared/PageHeader.vue";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasAbility } from "@/lib/access";
import { useAuthStore } from "@/stores/auth";
import { useTenantStore } from "@/stores/tenant";

const { t } = useI18n();
const auth = useAuthStore();
const tenant = useTenantStore();

const settingsSummary = computed(() => [
  {
    label: "Configure appearance",
    allowed: hasAbility(auth.user, { action: "configure", resource: "settings" }),
  },
  {
    label: "Workspace switching",
    allowed: tenant.hasFeature("workspaceSwitching"),
  },
  {
    label: "Directory sync",
    allowed: tenant.hasFeature("directorySync"),
  },
]);
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('pages.settings.title')" :description="t('pages.settings.description')" />
    <Card class="border-white/10 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Settings access posture</CardTitle>
        <CardDescription>
          Tenant-level configuration can now respond to both role ability and feature pack state.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap gap-2">
        <PermissionBadge
          v-for="item in settingsSummary"
          :key="item.label"
          :allowed="item.allowed"
          :allowed-label="item.label"
          :denied-label="`${item.label} · ${t('permissions.restricted')}`"
        />
      </CardContent>
    </Card>
    <ThemeStudio />
  </div>
</template>
