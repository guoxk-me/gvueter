<script setup lang="ts">
import type { SystemConfigInput, SystemConfigSection } from '@/features/system-config/types'
import { SlidersHorizontal } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'
import { Callout, PageHeader } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSystemConfig } from '@/features/system-config/composables/useSystemConfig'
import { canAccess } from '@/lib/ability'
import { ADMIN_DISPLAY_TIME_ZONE, getDateTimeLabel } from '@/lib/display-format'
import { ApiError } from '@/lib/http'
import SystemConfigForm from './SystemConfigForm.vue'

const { t, locale } = useI18n()
const activeSection = defineModel<SystemConfigSection>('activeSection', { default: 'site' })
const canManage = computed(() => canAccess('update', 'Settings'))
const { config, queryError, isLoading, isSaving, refresh, saveConfig } = useSystemConfig()
// AI modified: configuration audit time uses the shared locale and timezone contract.
const updatedAtLabel = computed(() =>
  config.value
    ? getDateTimeLabel(config.value.updatedAt, {
        locale: locale.value,
        timeZone: ADMIN_DISPLAY_TIME_ZONE,
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '',
)

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : t('errors.networkError')
}

async function saveSystemConfig(input: SystemConfigInput): Promise<void> {
  try {
    await saveConfig(input)
    toast.success(t('systemConfig.saveSuccess'))
  }
  catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader :title="t('systemConfig.title')" :description="t('systemConfig.description')">
      <template #actions>
        <Button as-child variant="outline">
          <RouterLink to="/system-config/parameters">
            <SlidersHorizontal class="size-4" aria-hidden="true" />
            {{ t('systemParameters.open') }}
          </RouterLink>
        </Button>
        <Button type="button" variant="outline" :disabled="isLoading" @click="refresh">
          {{ t('common.refresh') }}
        </Button>
      </template>
    </PageHeader>

    <Callout
      v-if="!canManage"
      :title="t('systemConfig.readOnlyTitle')"
      :description="t('systemConfig.readOnlyDescription')"
    />

    <div
      v-if="queryError"
      class="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
      role="alert"
    >
      <span>{{ getErrorMessage(queryError) }}</span>
      <Button type="button" size="sm" variant="outline" @click="refresh">
        {{ t('common.retry') }}
      </Button>
    </div>

    <div v-if="isLoading" class="space-y-4 rounded-lg border p-6" aria-busy="true">
      <Skeleton class="h-7 w-52" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-40 w-full" />
    </div>
    <template v-else-if="config">
      <SystemConfigForm
        v-model:active-section="activeSection"
        :config="config"
        :is-saving="isSaving"
        :is-read-only="!canManage"
        @save="saveSystemConfig"
      />
      <p class="text-right text-xs text-muted-foreground">
        {{ t('systemConfig.updatedAt', { time: updatedAtLabel }) }}
      </p>
    </template>
  </section>
</template>
