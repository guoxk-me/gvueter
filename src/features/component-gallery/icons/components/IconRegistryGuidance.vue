<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAdminIconComponent } from '@/components/admin/icon-selector'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MANAGED_MENU_ICON_KEYS } from '@/features/menus/types'
import CustomAdminIcon from './CustomAdminIcon.vue'

const { t } = useI18n()
const unknownIconKey = 'backend-widget-script'
// AI modified: even the failure example resolves through the same local lookup used by navigation.
const unknownIconComponent = computed(() => getAdminIconComponent(unknownIconKey))
</script>

<template>
  <Card data-testid="icon-registry-guidance">
    <CardHeader>
      <CardTitle>{{ t('components.iconGallery.registryTitle') }}</CardTitle>
      <CardDescription>{{ t('components.iconGallery.registryDescription') }}</CardDescription>
    </CardHeader>
    <CardContent class="grid min-w-0 gap-4 lg:grid-cols-2">
      <section
        class="rounded-lg border bg-muted/20 p-4"
        aria-labelledby="menu-icon-allowlist-title"
      >
        <h3 id="menu-icon-allowlist-title" class="font-semibold">
          {{ t('components.iconGallery.allowlistTitle') }}
        </h3>
        <p class="mt-1 text-sm text-muted-foreground">
          {{
            t('components.iconGallery.allowlistDescription', {
              count: MANAGED_MENU_ICON_KEYS.length,
            })
          }}
        </p>
        <code
          class="mt-3 block max-h-28 overflow-auto whitespace-pre-wrap break-all rounded-md bg-background p-3 text-xs"
          translate="no"
        >
          {{ MANAGED_MENU_ICON_KEYS.join(', ') }}
        </code>
      </section>

      <section
        class="rounded-lg border bg-muted/20 p-4"
        aria-labelledby="unknown-icon-fallback-title"
      >
        <h3 id="unknown-icon-fallback-title" class="font-semibold">
          {{ t('components.iconGallery.unknownIconTitle') }}
        </h3>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ t('components.iconGallery.unknownIconDescription') }}
        </p>
        <div class="mt-3 flex min-w-0 items-center gap-3 rounded-md bg-background p-3">
          <component
            :is="unknownIconComponent"
            class="size-6 shrink-0 text-warning"
            aria-hidden="true"
          />
          <code class="min-w-0 break-all text-xs" translate="no">
            {{ t('components.iconGallery.unknownKey', { key: unknownIconKey }) }}
          </code>
        </div>
      </section>

      <section
        class="rounded-lg border bg-muted/20 p-4"
        aria-labelledby="empty-icon-guidance-title"
      >
        <h3 id="empty-icon-guidance-title" class="font-semibold">
          {{ t('components.iconGallery.emptyIconTitle') }}
        </h3>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ t('components.iconGallery.emptyIconDescription') }}
        </p>
        <div class="mt-3 flex items-center gap-3 rounded-md bg-background p-3">
          <span class="size-6 shrink-0 rounded border border-dashed" aria-hidden="true" />
          <code class="text-xs" translate="no">iconKey: undefined</code>
        </div>
      </section>

      <section
        class="rounded-lg border bg-muted/20 p-4"
        aria-labelledby="custom-icon-guidance-title"
      >
        <h3 id="custom-icon-guidance-title" class="font-semibold">
          {{ t('components.iconGallery.customTitle') }}
        </h3>
        <p class="mt-1 text-sm text-muted-foreground">
          {{ t('components.iconGallery.customDescription') }}
        </p>
        <div class="mt-3 flex items-center gap-3 rounded-md bg-background p-3">
          <CustomAdminIcon
            class="size-8 shrink-0 text-primary"
            :title="t('components.iconGallery.customExampleLabel')"
          />
          <code class="text-xs" translate="no">CustomAdminIcon.vue</code>
        </div>
        <ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>{{ t('components.iconGallery.customSpecLocal') }}</li>
          <li>{{ t('components.iconGallery.customSpecColor') }}</li>
          <li>{{ t('components.iconGallery.customSpecA11y') }}</li>
          <li>{{ t('components.iconGallery.customSpecRegistry') }}</li>
        </ul>
      </section>

      <pre
        class="max-w-full overflow-x-auto rounded-lg border bg-background p-4 text-xs lg:col-span-2"
        translate="no"
      ><code>const icon = getAdminIconComponent(serverIconKey)
// Unknown keys return UNKNOWN_ADMIN_ICON_COMPONENT.
// Never: resolveComponent(serverIconKey), import(serverIconKey), or v-html.</code></pre>
    </CardContent>
  </Card>
</template>
