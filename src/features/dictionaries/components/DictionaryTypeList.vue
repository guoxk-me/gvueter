<script setup lang="ts">
import type { DictionaryType } from '@/features/dictionaries/types'
import { Pencil, Trash2 } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { ConfirmAction } from '@/components/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

defineProps<{
  dictionaryTypes: DictionaryType[]
  selectedDictionaryTypeId?: string
  isLoading: boolean
  isDeleting: boolean
  canManage: boolean
}>()

const emit = defineEmits<{
  select: [dictionaryTypeId: string]
  edit: [dictionaryType: DictionaryType]
  delete: [dictionaryType: DictionaryType]
}>()

const { t } = useI18n()
</script>

<template>
  <!-- AI modified: selection and destructive controls remain separate keyboard targets. -->
  <div class="space-y-2" role="list" :aria-label="t('dictionaries.types')">
    <template v-if="isLoading">
      <Skeleton v-for="index in 3" :key="index" class="h-20 w-full rounded-lg" />
    </template>
    <p
      v-else-if="dictionaryTypes.length === 0"
      class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"
    >
      {{ t('dictionaries.emptyTypes') }}
    </p>
    <div
      v-for="dictionaryType in dictionaryTypes"
      v-else
      :key="dictionaryType.id"
      class="group flex items-start gap-1 rounded-lg border p-2 transition-colors"
      :class="
        dictionaryType.id === selectedDictionaryTypeId
          ? 'border-primary bg-primary/5'
          : 'border-border hover:bg-muted/50'
      "
      role="listitem"
    >
      <button
        type="button"
        class="min-w-0 flex-1 rounded-md px-2 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :aria-pressed="dictionaryType.id === selectedDictionaryTypeId"
        @click="emit('select', dictionaryType.id)"
      >
        <span class="flex items-center gap-2">
          <span class="truncate text-sm font-medium">{{ dictionaryType.name }}</span>
          <Badge :variant="dictionaryType.status === 'active' ? 'outline' : 'secondary'">
            {{ t(`dictionaries.${dictionaryType.status}`) }}
          </Badge>
        </span>
        <code class="mt-1 block truncate text-xs text-muted-foreground">{{
          dictionaryType.code
        }}</code>
      </button>
      <div v-if="canManage" class="flex shrink-0 items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          :aria-label="t('dictionaries.editType')"
          @click="emit('edit', dictionaryType)"
        >
          <Pencil class="size-3.5" aria-hidden="true" />
        </Button>
        <ConfirmAction
          :title="t('dictionaries.deleteTypeTitle')"
          :description="t('dictionaries.deleteTypeConfirm', { name: dictionaryType.name })"
          :trigger-label="t('common.delete')"
          :confirm-label="t('common.delete')"
          :cancel-label="t('common.cancel')"
          :pending-label="t('common.loading')"
          trigger-variant="ghost"
          confirm-variant="destructive"
          :is-pending="isDeleting"
          @confirm="emit('delete', dictionaryType)"
        >
          <template #trigger>
            <Button type="button" variant="ghost" size="icon-sm" :aria-label="t('common.delete')">
              <Trash2 class="size-3.5 text-destructive" aria-hidden="true" />
            </Button>
          </template>
        </ConfirmAction>
      </div>
    </div>
  </div>
</template>
