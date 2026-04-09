<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AppIcon from "@/components/AppIcon.vue";

defineProps<{
  icon: string;
  label: string;
  value: string;
  delta: string;
}>();
</script>

<template>
  <Card
    class="relative overflow-hidden border-white/10 bg-card/85 shadow-[0_16px_40px_-28px_color-mix(in_oklab,var(--primary)_40%,transparent)] backdrop-blur-sm"
  >
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/45 to-transparent"
    />
    <CardHeader class="flex flex-row items-start justify-between space-y-0 pb-3">
      <div class="space-y-1.5">
        <CardTitle class="text-sm font-medium text-muted-foreground">
          {{ label }}
        </CardTitle>
        <div class="text-3xl font-semibold tracking-tight">
          {{ value }}
        </div>
      </div>
      <div
        class="rounded-2xl border border-primary/15 bg-primary/10 p-2 text-primary shadow-inner shadow-primary/10"
      >
        <AppIcon :icon="icon" class="size-5" />
      </div>
    </CardHeader>
    <CardContent class="pt-0 text-sm text-muted-foreground">
      {{ delta }}
    </CardContent>
  </Card>
</template>
