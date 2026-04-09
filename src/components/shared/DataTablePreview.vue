<script setup lang="ts" generic="TData extends Record<string, unknown>">
import { FlexRender, getCoreRowModel, useVueTable } from "@tanstack/vue-table";
import type { ColumnDef } from "@tanstack/vue-table";
import { computed } from "vue";

import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const props = defineProps<{
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
}>();

const data = computed(() => props.data);
const columns = computed(() => props.columns);

const table = useVueTable({
  get data() {
    return data.value;
  },
  get columns() {
    return columns.value;
  },
  getCoreRowModel: getCoreRowModel(),
});
</script>

<template>
  <div class="space-y-4">
    <slot name="toolbar" />
    <div
      class="overflow-hidden rounded-3xl border border-border/70 bg-card/85 shadow-[0_20px_48px_-32px_rgba(65,25,120,0.45)] backdrop-blur-sm"
    >
      <Table>
        <TableHeader>
          <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <TableHead
              v-for="header in headerGroup.headers"
              :key="header.id"
              class="h-11 text-xs uppercase tracking-[0.14em] text-muted-foreground"
            >
              <FlexRender
                v-if="!header.isPlaceholder"
                :render="header.column.columnDef.header"
                :props="header.getContext()"
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="table.getRowModel().rows?.length">
            <TableRow
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              class="hover:bg-primary/5 transition-colors duration-200"
            >
              <TableCell
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                class="py-4 align-middle"
              >
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableEmpty
              :colspan="columns.length"
              class="h-28 text-center text-sm text-muted-foreground"
            >
              No data available.
            </TableEmpty>
          </template>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
