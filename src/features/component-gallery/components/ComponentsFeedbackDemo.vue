<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { AsyncState, Callout, ConfirmAction, EmptyState, ProgressBar } from '@/components/admin'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ComponentDemoCard from './ComponentDemoCard.vue'

type StateMode = 'ready' | 'loading' | 'empty' | 'error'

const { t } = useI18n()
const isDialogOpen = shallowRef(false)
const stateMode = shallowRef<StateMode>('ready')
const isCalloutVisible = shallowRef(true)
const progressValue = shallowRef(64)
const isLoading = computed(() => stateMode.value === 'loading')
const isEmpty = computed(() => stateMode.value === 'empty')
const errorMessage = computed(() =>
  stateMode.value === 'error' ? t('components.feedback.loadError') : null,
)

function updateStateMode(value: AcceptableValue): void {
  if (value === 'ready' || value === 'loading' || value === 'empty' || value === 'error')
    stateMode.value = value
}

function retryState(): void {
  stateMode.value = 'ready'
  toast.success(t('components.feedback.retried'))
}

function advanceProgress(): void {
  progressValue.value = Math.min(progressValue.value + 12, 100)
  if (progressValue.value === 100) toast.success(t('components.feedback.progressComplete'))
}

function resetProgress(): void {
  progressValue.value = 0
}

function confirmDialog(): void {
  // AI modified: a named handler keeps multiple Vue event statements valid under the repository formatter.
  isDialogOpen.value = false
  toast.success(t('components.feedback.confirmed'))
}
</script>

<template>
  <div class="grid gap-4 xl:grid-cols-2">
    <ComponentDemoCard
      :title="t('components.feedback.actionsTitle')"
      :description="t('components.feedback.actionsDescription')"
    >
      <div class="flex flex-wrap gap-2">
        <Button @click="toast.success(t('components.feedback.saved'))">
          {{ t('components.feedback.successToast') }}
        </Button>
        <Button variant="destructive" @click="toast.error(t('components.feedback.failed'))">
          {{ t('components.feedback.errorToast') }}
        </Button>
        <Button variant="outline" @click="isDialogOpen = true">
          {{ t('components.feedback.openDialog') }}
        </Button>
        <ConfirmAction
          :title="t('components.feedback.confirmActionTitle')"
          :description="t('components.feedback.confirmActionDescription')"
          :trigger-label="t('components.feedback.confirmActionTrigger')"
          :confirm-label="t('components.feedback.confirmActionConfirm')"
          :cancel-label="t('common.cancel')"
          confirm-variant="destructive"
          @confirm="toast.success(t('components.feedback.confirmed'))"
        />
        <Popover>
          <PopoverTrigger as-child>
            <Button variant="outline">
              {{ t('components.feedback.openPopover') }}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <p class="text-sm font-medium">
              {{ t('components.feedback.popoverTitle') }}
            </p>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ t('components.feedback.popoverDescription') }}
            </p>
          </PopoverContent>
        </Popover>
      </div>
      <template #usage> toast.success('Saved') · &lt;Dialog v-model:open="isOpen" /&gt; </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="t('components.feedback.inlineTitle')"
      :description="t('components.feedback.inlineDescription')"
    >
      <Callout
        v-model:visible="isCalloutVisible"
        tone="warning"
        :title="t('components.feedback.calloutTitle')"
        :description="t('components.feedback.calloutDescription')"
        :close-label="t('components.feedback.dismissCallout')"
        dismissible
      >
        <template #actions>
          <Button
            type="button"
            variant="outline"
            size="sm"
            @click="toast.message(t('components.feedback.calloutActioned'))"
          >
            {{ t('components.feedback.calloutAction') }}
          </Button>
        </template>
      </Callout>
      <Button
        v-if="!isCalloutVisible"
        type="button"
        variant="outline"
        size="sm"
        @click="isCalloutVisible = true"
      >
        {{ t('components.feedback.showCallout') }}
      </Button>
      <div class="space-y-3">
        <ProgressBar
          :value="progressValue"
          :label="t('components.feedback.progressLabel')"
          tone="success"
        />
        <div class="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            :disabled="progressValue === 100"
            @click="advanceProgress"
          >
            {{ t('components.feedback.advanceProgress') }}
          </Button>
          <Button type="button" variant="ghost" size="sm" @click="resetProgress">
            {{ t('components.feedback.resetProgress') }}
          </Button>
        </div>
      </div>
      <template #usage>
        &lt;Callout v-model:visible="isVisible" tone="warning" /&gt; · &lt;ProgressBar
        :value="progress" /&gt;
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="t('components.feedback.emptyTitle')"
      :description="t('components.feedback.emptyDescription')"
    >
      <EmptyState
        :title="t('components.feedback.noNotifications')"
        :description="t('components.feedback.noNotificationsDescription')"
      >
        <template #actions>
          <Button
            variant="outline"
            size="sm"
            @click="toast.message(t('components.feedback.allCaughtUp'))"
          >
            {{ t('components.feedback.markRead') }}
          </Button>
        </template>
      </EmptyState>
    </ComponentDemoCard>

    <ComponentDemoCard
      class="xl:col-span-2"
      :title="t('components.feedback.asyncTitle')"
      :description="t('components.feedback.asyncDescription')"
    >
      <!-- AI modified: the state picker can wrap and share the card width when translated copy grows. -->
      <div class="mb-4 flex min-w-0 flex-wrap items-center gap-2">
        <span class="min-w-0 break-words text-sm text-muted-foreground">
          {{ t('components.feedback.previewState') }}
        </span>
        <Select :model-value="stateMode" @update:model-value="updateStateMode">
          <SelectTrigger class="min-w-0 max-w-full flex-1 basis-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ready">
              {{ t('components.feedback.ready') }}
            </SelectItem>
            <SelectItem value="loading">
              {{ t('components.feedback.loading') }}
            </SelectItem>
            <SelectItem value="empty">
              {{ t('components.feedback.empty') }}
            </SelectItem>
            <SelectItem value="error">
              {{ t('components.feedback.error') }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <AsyncState
        :is-loading="isLoading"
        :is-empty="isEmpty"
        :error="errorMessage"
        :empty-title="t('components.feedback.noResults')"
        :empty-description="t('components.feedback.adjustFilters')"
        :error-title="t('components.feedback.unavailable')"
        :retry-label="t('common.refresh')"
        @retry="retryState"
      >
        <div class="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          {{ t('components.feedback.readyContent') }}
        </div>
      </AsyncState>
      <template #usage>
        &lt;AsyncState :is-loading="query.isPending" :error="errorMessage" @retry="query.refetch"
        /&gt;
      </template>
    </ComponentDemoCard>
  </div>

  <Dialog v-model:open="isDialogOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ t('components.feedback.dialogTitle') }}</DialogTitle>
        <DialogDescription>{{ t('components.feedback.dialogDescription') }}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="isDialogOpen = false">
          {{ t('common.cancel') }}
        </Button>
        <Button @click="confirmDialog">
          {{ t('common.confirm') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
