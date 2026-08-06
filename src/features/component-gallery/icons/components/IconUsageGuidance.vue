<script setup lang="ts">
import { Activity, CircleCheck, CircleX, Clock, Info, TriangleAlert } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const { t } = useI18n()
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t('components.iconGallery.usageTitle') }}</CardTitle>
      <CardDescription>{{ t('components.iconGallery.usageDescription') }}</CardDescription>
    </CardHeader>
    <CardContent class="grid min-w-0 gap-6 xl:grid-cols-2">
      <section class="space-y-3" aria-labelledby="icon-size-guidance-title">
        <div>
          <h3 id="icon-size-guidance-title" class="font-semibold">
            {{ t('components.iconGallery.sizesTitle') }}
          </h3>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ t('components.iconGallery.sizesDescription') }}
          </p>
        </div>
        <div class="flex min-w-0 flex-wrap items-end gap-4 rounded-lg border bg-muted/20 p-4">
          <div
            v-for="size in [16, 20, 24, 32]"
            :key="size"
            class="flex min-w-12 flex-col items-center gap-2"
          >
            <Activity :size="size" aria-hidden="true" />
            <code class="text-xs">{{ size }} px</code>
          </div>
        </div>
      </section>

      <section class="space-y-3" aria-labelledby="icon-state-guidance-title">
        <div>
          <h3 id="icon-state-guidance-title" class="font-semibold">
            {{ t('components.iconGallery.colorsTitle') }}
          </h3>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ t('components.iconGallery.colorsDescription') }}
          </p>
        </div>
        <ul class="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
          <li class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <Info class="size-4 shrink-0" aria-hidden="true" />
            {{ t('components.iconGallery.defaultState') }}
          </li>
          <li
            class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground"
          >
            <Clock class="size-4 shrink-0" aria-hidden="true" />
            {{ t('components.iconGallery.mutedState') }}
          </li>
          <li class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-success">
            <CircleCheck class="size-4 shrink-0" aria-hidden="true" />
            {{ t('components.iconGallery.successState') }}
          </li>
          <li class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-warning">
            <TriangleAlert class="size-4 shrink-0" aria-hidden="true" />
            {{ t('components.iconGallery.warningState') }}
          </li>
          <li class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-destructive">
            <CircleX class="size-4 shrink-0" aria-hidden="true" />
            {{ t('components.iconGallery.errorState') }}
          </li>
        </ul>
      </section>

      <section class="space-y-3 xl:col-span-2" aria-labelledby="icon-accessibility-guidance-title">
        <h3 id="icon-accessibility-guidance-title" class="font-semibold">
          {{ t('components.iconGallery.accessibilityTitle') }}
        </h3>
        <ul class="grid min-w-0 gap-2 text-sm text-muted-foreground md:grid-cols-3">
          <li class="rounded-lg border bg-background p-3">
            {{ t('components.iconGallery.accessibilityDecorative') }}
          </li>
          <li class="rounded-lg border bg-background p-3">
            {{ t('components.iconGallery.accessibilityInteractive') }}
          </li>
          <li class="rounded-lg border bg-background p-3">
            {{ t('components.iconGallery.accessibilityMeaning') }}
          </li>
        </ul>
      </section>
    </CardContent>
  </Card>
</template>
