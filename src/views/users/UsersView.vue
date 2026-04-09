<script setup lang="ts">
import type { ColumnDef } from "@tanstack/vue-table";
import { computed, h, ref } from "vue";
import { useI18n } from "vue-i18n";

import DataTablePreview from "@/components/shared/DataTablePreview.vue";
import DataTableToolbar from "@/components/shared/DataTableToolbar.vue";
import PageHeader from "@/components/shared/PageHeader.vue";
import { Badge } from "@/components/ui/badge";
import { savedViews, users } from "@/data/admin";

type UserRecord = (typeof users)[number];

const { t } = useI18n();
const query = ref("");
const filterValue = ref("all");
const activeView = ref("all");

const filteredUsers = computed(() => {
  const search = query.value.trim().toLowerCase();

  return users.filter((user) => {
    const matchesSearch =
      !search ||
      [user.name, user.email, user.team, user.role].some((value) =>
        value.toLowerCase().includes(search),
      );

    const matchesFilter =
      filterValue.value === "all" ||
      user.status.toLowerCase() === filterValue.value ||
      user.team.toLowerCase().includes(filterValue.value);

    const matchesView =
      activeView.value === "all" ||
      (activeView.value === "security-core" && ["Platform", "Security"].includes(user.team)) ||
      (activeView.value === "pending-invites" && user.status === "Invited");

    return matchesSearch && matchesFilter && matchesView;
  });
});

const filterOptions = [
  { label: "Active only", value: "active" },
  { label: "Invited only", value: "invited" },
  { label: "Platform team", value: "platform" },
] as const;

const columns: ColumnDef<UserRecord>[] = [
  {
    accessorKey: "name",
    header: "User",
    cell: ({ row }) =>
      h("div", { class: "space-y-1" }, [
        h("div", { class: "font-medium" }, row.original.name),
        h("div", { class: "text-sm text-muted-foreground" }, row.original.email),
      ]),
  },
  { accessorKey: "team", header: "Team" },
  { accessorKey: "role", header: "Role" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) =>
      h(
        Badge,
        {
          variant:
            row.original.status === "Active"
              ? "secondary"
              : row.original.status === "Invited"
                ? "outline"
                : "destructive",
          class: "rounded-full",
        },
        () => row.original.status,
      ),
  },
];
</script>

<template>
  <div class="space-y-6">
    <PageHeader :title="t('pages.users.title')" :description="t('pages.users.description')" />
    <DataTablePreview :columns="columns" :data="filteredUsers">
      <template #toolbar>
        <DataTableToolbar
          v-model:query="query"
          v-model:filter-value="filterValue"
          v-model:active-view="activeView"
          title="Identity control table"
          description="A starter data experience for the full edition: search, quick filters and saved views for operator flows."
          search-placeholder="Search users, teams or roles..."
          total-label="users"
          :total-count="users.length"
          :filtered-count="filteredUsers.length"
          :filter-options="[...filterOptions]"
          :saved-views="savedViews.users"
        />
      </template>
    </DataTablePreview>
  </div>
</template>
