<script setup lang="ts">
import { Blocks, Languages, ShieldCheck } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { RouterView } from 'vue-router'
import AdminBrand from '@/components/layout/AdminBrand.vue'
import LanguageToggleButton from '@/components/layout/LanguageToggleButton.vue'
import ThemeToggleButton from '@/components/layout/ThemeToggleButton.vue'

const { t } = useI18n()

const capabilities = [
  { icon: ShieldCheck, labelKey: 'auth.capabilityPermissions' },
  { icon: Blocks, labelKey: 'auth.capabilityComponents' },
  { icon: Languages, labelKey: 'auth.capabilityLocalization' },
] as const
</script>

<template>
  <div class="min-h-svh bg-surface lg:grid lg:grid-cols-[56%_44%]">
    <!-- AI modified: the authentication shell follows the approved 56/44 Quiet Layers pattern. -->
    <aside
      class="relative hidden min-h-svh overflow-hidden border-r border-border bg-surface-subtle lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-10 xl:px-18 xl:py-12"
      :aria-label="t('auth.productContextLabel')"
    >
      <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          class="absolute -right-24 top-[18%] size-80 rotate-12 rounded-[3rem] border border-primary/12 bg-primary/4"
        />
        <div
          class="absolute -right-8 top-[27%] size-64 -rotate-6 rounded-[2.5rem] border border-primary/16 bg-surface/45"
        />
        <div
          class="absolute bottom-[12%] left-[42%] size-28 rotate-12 rounded-3xl border border-primary/12"
        />
      </div>

      <AdminBrand class="relative z-10" />

      <div class="relative z-10 max-w-xl">
        <p class="mb-4 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
          {{ t('auth.productEyebrow') }}
        </p>
        <h1 class="max-w-lg text-4xl leading-[1.15] font-semibold tracking-[-0.035em] text-foreground xl:text-[2.75rem]">
          {{ t('auth.productHeadline') }}
        </h1>
        <p class="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
          {{ t('auth.productPositioning') }}
        </p>

        <ul class="mt-8 grid gap-3" role="list">
          <li
            v-for="capability in capabilities"
            :key="capability.labelKey"
            class="flex items-center gap-3 text-sm font-medium text-foreground"
          >
            <span
              class="flex size-8 items-center justify-center rounded-md bg-primary/9 text-primary"
              aria-hidden="true"
            >
              <component :is="capability.icon" class="size-4" />
            </span>
            {{ t(capability.labelKey) }}
          </li>
        </ul>
      </div>

      <p class="relative z-10 text-xs text-muted-foreground">
        {{ t('common.copyright', { year: new Date().getFullYear() }) }}
      </p>
    </aside>

    <main class="flex min-h-svh flex-col bg-surface px-5 py-5 sm:px-8 sm:py-7 lg:px-12 lg:py-7">
      <header class="flex h-9 items-center justify-between gap-4 lg:justify-end">
        <AdminBrand class="lg:hidden" />
        <div class="flex items-center gap-1">
          <LanguageToggleButton size="icon" side="bottom" />
          <ThemeToggleButton size="icon" side="bottom" />
        </div>
      </header>

      <div class="flex flex-1 items-center justify-center py-10 sm:py-14 lg:py-8">
        <div class="w-full max-w-[26.25rem]">
          <RouterView />
        </div>
      </div>

      <p class="text-center text-xs text-muted-foreground lg:hidden">
        {{ t('common.copyright', { year: new Date().getFullYear() }) }}
      </p>
    </main>
  </div>
</template>
