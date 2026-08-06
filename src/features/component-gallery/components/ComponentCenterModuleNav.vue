<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { componentCenterModules } from '../component-center-modules'

const { t } = useI18n()
</script>

<template>
  <nav :aria-label="t('components.center.moduleNavLabel')" class="min-w-0 overflow-x-auto pb-1">
    <div class="flex min-w-max gap-1 rounded-lg border bg-muted/30 p-1">
      <RouterLink
        v-for="componentModule in componentCenterModules"
        v-slot="{ href, isExactActive, navigate }"
        :key="componentModule.id"
        :to="componentModule.path"
        custom
      >
        <a
          :href="href"
          :aria-current="isExactActive ? 'page' : undefined"
          class="inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm whitespace-nowrap outline-none transition-colors hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-background aria-[current=page]:font-medium aria-[current=page]:shadow-sm"
          @click="navigate"
        >
          <component :is="componentModule.icon" class="size-3.5" aria-hidden="true" />
          {{ t(componentModule.titleKey) }}
        </a>
      </RouterLink>
    </div>
  </nav>
</template>
