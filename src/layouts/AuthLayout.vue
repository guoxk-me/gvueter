<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-background px-4 py-8 md:px-10">
    <div
      class="pointer-events-none absolute inset-0 opacity-80"
      :style="{ backgroundImage: 'var(--surface-glow)' }"
    />
    <div
      class="absolute inset-y-0 left-1/2 hidden w-px bg-linear-to-b from-transparent via-primary/25 to-transparent lg:block"
    />
    <div
      class="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]"
    >
      <section class="space-y-8 px-2 lg:px-8">
        <div
          class="inline-flex items-center gap-3 rounded-full border border-white/10 bg-card/70 px-4 py-2 shadow-lg shadow-primary/10 backdrop-blur"
        >
          <div class="size-3 rounded-full bg-primary shadow-[0_0_18px_var(--primary)]" />
          <span class="text-sm font-medium text-muted-foreground">{{
            t("dashboard.highlight")
          }}</span>
        </div>
        <div class="space-y-5">
          <h1 class="max-w-2xl text-5xl font-semibold tracking-tight text-balance md:text-6xl">
            {{ t("app.name") }}
          </h1>
          <p class="max-w-2xl text-lg leading-8 text-muted-foreground">
            {{ t("auth.welcome") }}
          </p>
          <p class="max-w-2xl text-sm leading-7 text-muted-foreground/90">
            {{ t("auth.subtitle") }}
          </p>
        </div>
        <div class="grid gap-4 md:grid-cols-3">
          <div
            class="rounded-3xl border border-white/10 bg-card/75 p-4 shadow-2xl shadow-primary/5 backdrop-blur"
          >
            <div class="text-2xl font-semibold">128</div>
            <div class="mt-2 text-sm text-muted-foreground">
              Live tenants with capability gating
            </div>
          </div>
          <div
            class="rounded-3xl border border-white/10 bg-card/75 p-4 shadow-2xl shadow-primary/5 backdrop-blur"
          >
            <div class="text-2xl font-semibold">42.8K</div>
            <div class="mt-2 text-sm text-muted-foreground">
              Identities managed across workspaces
            </div>
          </div>
          <div
            class="rounded-3xl border border-white/10 bg-card/75 p-4 shadow-2xl shadow-primary/5 backdrop-blur"
          >
            <div class="text-2xl font-semibold">99.98%</div>
            <div class="mt-2 text-sm text-muted-foreground">
              Observed reliability across critical regions
            </div>
          </div>
        </div>
      </section>
      <section class="lg:px-8">
        <RouterView />
      </section>
    </div>
  </div>
</template>
