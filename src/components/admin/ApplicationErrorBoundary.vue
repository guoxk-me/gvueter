<script setup lang="ts">
import { computed, nextTick, onErrorCaptured, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { applicationFailure, setApplicationFailure } from '@/lib/application-recovery'
import { reportVueError } from '@/lib/observability'
import PageStatePanel from './PageStatePanel.vue'

const props = defineProps<{
  reloadApplication: () => void
}>()

defineSlots<{
  default: () => unknown
}>()

const { t } = useI18n()
const recoveryPanel = useTemplateRef<HTMLElement>('recoveryPanel')

const recoveryCopy = computed(() => {
  switch (applicationFailure.value?.kind) {
    case 'asset-preload':
      return {
        title: t('errors.applicationRecovery.assetTitle'),
        description: t('errors.applicationRecovery.assetDescription'),
      }
    case 'navigation':
      return {
        title: t('errors.applicationRecovery.navigationTitle'),
        description: t('errors.applicationRecovery.navigationDescription'),
      }
    case 'bootstrap':
      return {
        title: t('errors.applicationRecovery.bootstrapTitle'),
        description: t('errors.applicationRecovery.bootstrapDescription'),
      }
    default:
      return {
        title: t('errors.applicationRecovery.runtimeTitle'),
        description: t('errors.applicationRecovery.runtimeDescription'),
      }
  }
})

onErrorCaptured((failure, instance, lifecycleInfo) => {
  // AI modified: the boundary reports once, then stops Vue from rethrowing a failure it visibly recovered.
  setApplicationFailure('vue-runtime')
  reportVueError(failure, instance, lifecycleInfo)
  return false
})

watch(
  applicationFailure,
  async (failure) => {
    if (!failure) return
    await nextTick()
    recoveryPanel.value?.focus()
  },
  { immediate: true },
)
</script>

<template>
  <slot v-if="!applicationFailure" />
  <main
    v-else
    ref="recoveryPanel"
    class="flex min-h-svh items-center justify-center bg-background px-6 py-12 outline-none"
    tabindex="-1"
    :aria-label="recoveryCopy.title"
    :data-application-recovery="applicationFailure.kind"
  >
    <PageStatePanel
      class="w-full max-w-lg"
      state="fatal-error"
      :heading-level="1"
      :title="recoveryCopy.title"
      :description="recoveryCopy.description"
      :primary-action-label="t('common.reloadApplication')"
      @primary-action="props.reloadApplication"
    />
  </main>
</template>
