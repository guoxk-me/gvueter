<script setup lang="ts">
import { Icon } from "@iconify/vue";
import type { HTMLAttributes } from "vue";

import { cn } from "@/lib/utils";

defineProps<{
  icon: string;
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <Icon :icon="icon" :class="cn('size-4 shrink-0', $props.class)" />
</template>
