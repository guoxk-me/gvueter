<script setup lang="ts">
import type { ColumnDef } from "@tanstack/vue-table";
import { computed, h, ref } from "vue";
import { useI18n } from "vue-i18n";

import DataTablePreview from "@/components/shared/DataTablePreview.vue";
import DataTableToolbar from "@/components/shared/DataTableToolbar.vue";
import PageHeader from "@/components/shared/PageHeader.vue";
import PermissionBadge from "@/components/shared/PermissionBadge.vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { roles } from "@/data/admin";
import { hasAbility } from "@/lib/access";
import { useAuthStore } from "@/stores/auth";

type RoleRecord = (typeof roles)[number];

const { t } = useI18n();
const auth = useAuthStore();
const query = ref("");

const filteredRoles = computed(() => {
  const search = query.value.trim().toLowerCase();

  return roles.filter((role) => {
    return (
      !search ||
      [role.name, role.scope, role.permissions].some((value) =>
        value.toLowerCase().includes(search),
      )
    );
  });
});

const canManageRoles = computed(() =>
  hasAbility(auth.user, { action: "manage", resource: "roles" }),
);

const columns: ColumnDef<RoleRecord>[] = [
  { accessorKey: "name", header: "Role" },
  { accessorKey: "scope", header: "Scope" },
  { accessorKey: "members", header: "Members" },
  { accessorKey: "permissions", header: "Capability summary" },
];
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('pages.roles.title')" :description="t('pages.roles.description')" />
    <Card class="border-white/10 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Role governance posture</CardTitle>
        <CardDescription>
          Show how the current operator maps onto the role-management surface.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap items-center justify-between gap-4">
        <PermissionBadge
          :allowed="canManageRoles"
          allowed-label="Can manage roles"
          :denied-label="t('permissions.restricted')"
        />
        <Button :disabled="!canManageRoles" class="rounded-full">
          {{ canManageRoles ? "Create role" : "Role creation locked" }}
        </Button>
      </CardContent>
    </Card>

    <DataTablePreview :columns="columns" :data="filteredRoles">
      <template #toolbar>
        <DataTableToolbar
          v-model:query="query"
          title="Role capability map"
          description="Search role scopes and permission summaries before wiring the model to a policy service."
          search-placeholder="Search roles or scopes..."
          total-label="roles"
          :total-count="roles.length"
          :filtered-count="filteredRoles.length"
        />
      </template>
    </DataTablePreview>
  </div>
</template>
