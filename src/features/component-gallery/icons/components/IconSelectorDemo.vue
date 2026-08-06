<script setup lang="ts">
import type { AdminIconKey } from '@/components/admin/icon-selector'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAdminIconOption } from '@/components/admin/icon-selector'
import IconSelector from '@/components/admin/IconSelector.vue'
import { Badge } from '@/components/ui/badge'
import ComponentDemoCard from '../../components/ComponentDemoCard.vue'

const { t } = useI18n()
const selectedIconKey = shallowRef<AdminIconKey | undefined>('dashboard')
const selectedIcon = computed(() => getAdminIconOption(selectedIconKey.value))
</script>

<template>
  <ComponentDemoCard
    :title="t('components.iconGallery.selectorTitle')"
    :description="t('components.iconGallery.selectorDescription')"
  >
    <div class="max-w-xl">
      <IconSelector v-model="selectedIconKey" />
    </div>
    <div class="flex min-w-0 flex-wrap items-center gap-2" role="status" aria-live="polite">
      <code class="break-all rounded bg-muted px-2 py-1 text-xs" translate="no">
        {{
          selectedIconKey
            ? t('components.iconGallery.selectedKey', { key: selectedIconKey })
            : t('components.iconGallery.noSelection')
        }}
      </code>
      <Badge v-if="selectedIcon?.isMenuSafe" variant="secondary">
        {{ t('components.iconGallery.menuSafe') }}
      </Badge>
    </div>
    <template #usage>
      v-model: AdminIconKey | undefined; emitted values always come from ADMIN_ICON_OPTIONS.
    </template>
  </ComponentDemoCard>
</template>
