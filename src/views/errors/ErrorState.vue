<script setup lang="ts">
import { Button } from "@/components/ui/button";

defineProps<{
  code: string;
  title: string;
  description: string;
  primaryLabel: string;
}>();

const emit = defineEmits<{
  primary: [];
}>();
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4 py-12">
    <div
      class="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-card/78 p-10 text-center shadow-[0_28px_90px_-46px_color-mix(in_oklab,var(--primary)_60%,transparent)] backdrop-blur-xl"
    >
      <div class="text-sm font-semibold uppercase tracking-[0.3em] text-primary">{{ code }}</div>
      <h1 class="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">{{ title }}</h1>
      <p class="mx-auto mt-4 max-w-xl text-base leading-8 text-muted-foreground">
        {{ description }}
      </p>
      <div class="mt-8 flex justify-center">
        <Button class="rounded-full px-6" @click="emit('primary')">
          {{ primaryLabel }}
        </Button>
      </div>
    </div>
  </div>
</template>
