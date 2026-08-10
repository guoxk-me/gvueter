<script setup lang="ts">
import { AlertCircle, RefreshCw } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/http'
import EmptyState from './EmptyState.vue'

const props = withDefaults(
  defineProps<{
    isLoading?: boolean
    isEmpty?: boolean
    error?: Error | string | null
    emptyTitle?: string
    emptyDescription?: string
    errorTitle?: string
    retryLabel?: string
  }>(),
  {
    isLoading: false,
    isEmpty: false,
    error: null,
  },
)

const emit = defineEmits<{
  retry: []
}>()

defineSlots<{
  default?: () => unknown
  loading?: () => unknown
  empty?: () => unknown
  error?: (props: { message: string; nextAction?: string; requestId?: string }) => unknown
}>()

const { t } = useI18n()
const emptyTitle = computed(() => props.emptyTitle ?? t('common.noResults'))
const errorTitle = computed(() => props.errorTitle ?? t('common.unableToLoad'))
const retryLabel = computed(() => props.retryLabel ?? t('common.retry'))
const errorMessage = computed(() =>
  typeof props.error === 'string' ? props.error : (props.error?.message ?? ''),
)
const requestId = computed(() =>
  props.error instanceof ApiError ? props.error.requestId : undefined,
)
const nextAction = computed(() =>
  props.error instanceof ApiError && props.error.nextAction !== 'none'
    ? t(`errors.actions.${props.error.nextAction}`)
    : undefined,
)
const errorDescription = computed(() =>
  [
    errorMessage.value,
    nextAction.value,
    requestId.value ? t('common.requestId', { requestId: requestId.value }) : undefined,
  ]
    .filter((description): description is string => Boolean(description))
    .join(' · '),
)
</script>

<template>
  <slot v-if="props.isLoading" name="loading">
    <!-- AI modified: default loading placeholders use the shared Skeleton primitive while retaining live-region semantics. -->
    <div class="flex flex-col gap-3" role="status" aria-live="polite" aria-busy="true">
      <span class="sr-only">{{ t('common.loading') }}</span>
      <Skeleton class="h-5 w-2/5" />
      <Skeleton class="h-20" />
      <Skeleton class="h-20" />
    </div>
  </slot>
  <slot
    v-else-if="props.error"
    name="error"
    :message="errorMessage"
    :next-action="nextAction"
    :request-id="requestId"
  >
    <!-- AI modified: shared failures expose an actionable recovery hint and trace ID without leaking payload details. -->
    <div role="alert">
      <EmptyState :title="errorTitle" :description="errorDescription" :icon="AlertCircle">
        <template #actions>
          <Button variant="outline" @click="emit('retry')">
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            {{ retryLabel }}
          </Button>
        </template>
      </EmptyState>
    </div>
  </slot>
  <slot v-else-if="props.isEmpty" name="empty">
    <EmptyState :title="emptyTitle" :description="props.emptyDescription" />
  </slot>
  <slot v-else />
</template>
