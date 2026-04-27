<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-background">
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,_var(--color-primary)_10%,_transparent),_transparent_38%),linear-gradient(180deg,_color-mix(in_oklab,_var(--color-muted)_55%,_transparent),_transparent_42%)]"
    />

    <main class="relative z-0 flex min-h-screen items-center justify-center px-4 py-16">
      <div class="w-full max-w-md space-y-6">
        <RouterView />
        <p class="text-center text-xs text-muted-foreground">
          {{ t('common.copyright', { year: new Date().getFullYear() }) }}
        </p>
      </div>
    </main>
  </div>
</template>
