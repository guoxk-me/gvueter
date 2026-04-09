<script setup lang="ts">
import { computed } from "vue";

import { Badge } from "@/components/ui/badge";

const props = defineProps<{
  allowed: boolean;
  allowedLabel?: string;
  deniedLabel?: string;
}>();

const label = computed(() =>
  props.allowed ? (props.allowedLabel ?? "Allowed") : (props.deniedLabel ?? "Restricted"),
);
</script>

<template>
  <Badge
    :variant="allowed ? 'secondary' : 'outline'"
    :class="[
      'rounded-full px-3 py-1',
      allowed ? '' : 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    ]"
  >
    {{ label }}
  </Badge>
</template>
