<script setup lang="ts">
import { computed } from "vue";

import AppIcon from "@/components/AppIcon.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

type ToolbarOption = {
  label: string;
  value: string;
};

type SavedView = {
  id: string;
  label: string;
  description?: string;
};

const props = withDefaults(
  defineProps<{
    title: string;
    description: string;
    searchPlaceholder?: string;
    totalLabel?: string;
    filterLabel?: string;
    viewLabel?: string;
    totalCount: number;
    filteredCount: number;
    filterOptions?: ToolbarOption[];
    savedViews?: SavedView[];
  }>(),
  {
    searchPlaceholder: "Search records...",
    totalLabel: "Records",
    filterLabel: "Filter",
    viewLabel: "Views",
    filterOptions: () => [],
    savedViews: () => [],
  },
);

const query = defineModel<string>("query", { default: "" });
const filterValue = defineModel<string>("filterValue", { default: "all" });
const activeView = defineModel<string>("activeView", { default: "all" });

const activeFilter = computed(() => {
  return props.filterOptions.find((option) => option.value === filterValue.value)?.label ?? "All";
});

const activeSavedView = computed(() => {
  return props.savedViews.find((view) => view.id === activeView.value)?.label ?? "All views";
});
</script>

<template>
  <div
    class="space-y-4 rounded-[1.75rem] border border-border/70 bg-card/80 p-5 shadow-[0_20px_48px_-32px_rgba(65,25,120,0.32)] backdrop-blur-sm"
  >
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-1.5">
        <div class="text-base font-semibold tracking-tight">{{ title }}</div>
        <p class="max-w-2xl text-sm leading-6 text-muted-foreground">
          {{ description }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" class="rounded-full px-3 py-1"
          >{{ filteredCount }} / {{ totalCount }} {{ totalLabel }}</Badge
        >
        <Badge variant="outline" class="rounded-full px-3 py-1">{{ activeSavedView }}</Badge>
      </div>
    </div>

    <div class="flex flex-col gap-3 xl:flex-row xl:items-center">
      <div class="relative flex-1">
        <AppIcon
          icon="lucide:search"
          class="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          v-model="query"
          :placeholder="searchPlaceholder"
          class="h-11 rounded-2xl border-border/70 bg-background/70 pl-11"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" class="rounded-full border-border/70 bg-background/70 px-4">
              <AppIcon icon="lucide:list-filter" />
              <span>{{ filterLabel }}: {{ activeFilter }}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56 rounded-2xl border-border/60 p-2">
            <DropdownMenuLabel>{{ filterLabel }}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem class="rounded-xl" @click="filterValue = 'all'">All</DropdownMenuItem>
            <DropdownMenuItem
              v-for="option in filterOptions"
              :key="option.value"
              class="rounded-xl"
              @click="filterValue = option.value"
            >
              {{ option.label }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" class="rounded-full border-border/70 bg-background/70 px-4">
              <AppIcon icon="lucide:bookmark" />
              <span>{{ viewLabel }}: {{ activeSavedView }}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-64 rounded-2xl border-border/60 p-2">
            <DropdownMenuLabel>{{ viewLabel }}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem class="rounded-xl" @click="activeView = 'all'"
              >All views</DropdownMenuItem
            >
            <DropdownMenuItem
              v-for="view in savedViews"
              :key="view.id"
              class="rounded-xl py-3"
              @click="activeView = view.id"
            >
              <div>
                <div class="text-sm font-medium">{{ view.label }}</div>
                <div v-if="view.description" class="text-xs text-muted-foreground">
                  {{ view.description }}
                </div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>
</template>
