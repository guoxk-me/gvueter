<script setup lang="ts">
import type { HTMLAttributes } from "vue";

import { cn } from "@/lib/utils";

defineProps<{
  eyebrow?: string;
  title: string;
  description: string;
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div :class="cn('space-y-3', $props.class)">
    <div
      v-if="eyebrow"
      class="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary"
    >
      {{ eyebrow }}
    </div>
    <div class="space-y-1.5">
      <h1 class="text-3xl font-semibold tracking-tight text-balance">
        {{ title }}
      </h1>
      <p class="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
        {{ description }}
      </p>
    </div>
  </div>
</template>
