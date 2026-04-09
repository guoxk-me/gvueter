<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import PageHeader from "@/components/shared/PageHeader.vue";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth";
import { usePreferencesStore } from "@/stores/preferences";
import { useTenantStore } from "@/stores/tenant";

const auth = useAuthStore();
const preferences = usePreferencesStore();
const tenant = useTenantStore();
const { t } = useI18n();

const sections = computed(() => [
  { label: "Current role", value: auth.user?.title ?? "-" },
  { label: "Current tenant", value: tenant.currentTenant?.name ?? "-" },
  { label: "Locale", value: preferences.locale },
  { label: "Appearance", value: `${preferences.mode} / ${preferences.accent}` },
]);
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('pages.profile.title')" :description="t('pages.profile.description')" />
    <Card class="border-white/10 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>{{ auth.user?.name }}</CardTitle>
        <CardDescription>{{ auth.user?.email }}</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="section in sections"
          :key="section.label"
          class="rounded-2xl border border-border/70 bg-background/35 p-4"
        >
          <div class="text-sm text-muted-foreground">{{ section.label }}</div>
          <div class="mt-2 text-base font-medium">{{ section.value }}</div>
        </div>
      </CardContent>
    </Card>
    <Card class="border-white/10 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Operator profile</CardTitle>
        <CardDescription
          >Full edition users often need visibility into tenant context and interface
          preferences.</CardDescription
        >
      </CardHeader>
      <CardContent class="flex flex-wrap gap-2">
        <Badge variant="secondary" class="rounded-full">Multi-tenant ready</Badge>
        <Badge variant="secondary" class="rounded-full">Theme aware</Badge>
        <Badge variant="secondary" class="rounded-full">Locale aware</Badge>
        <Badge variant="secondary" class="rounded-full">Route-guarded</Badge>
      </CardContent>
    </Card>
  </div>
</template>
