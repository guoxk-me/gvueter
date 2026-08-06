<script setup lang="ts">
import type { AdminUser } from '@/features/users/types'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const props = withDefaults(
  defineProps<{
    user?: AdminUser
    selectedCount?: number
    isDeleting: boolean
  }>(),
  {
    selectedCount: 0,
  },
)

const emit = defineEmits<{ confirm: [] }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const isBulkDelete = computed(() => !props.user && props.selectedCount > 0)
const description = computed(() =>
  isBulkDelete.value
    ? t('users.bulkDeleteConfirm', { count: props.selectedCount })
    : t('users.deleteConfirm', { name: props.user?.name }),
)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ isBulkDelete ? t('users.bulkDelete') : t('common.delete') }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="outline" :disabled="isDeleting" @click="open = false">
          {{ t('common.cancel') }}
        </Button>
        <Button type="button" variant="destructive" :disabled="isDeleting" @click="emit('confirm')">
          {{ t('common.delete') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
