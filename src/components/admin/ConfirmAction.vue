<script setup lang="ts">
import type { ButtonVariants } from '@/components/ui/button'
import { LoaderCircle } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    triggerLabel: string
    confirmLabel?: string
    cancelLabel?: string
    pendingLabel?: string
    triggerVariant?: ButtonVariants['variant']
    confirmVariant?: ButtonVariants['variant']
    isPending?: boolean
    closeOnConfirm?: boolean
  }>(),
  {
    description: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    pendingLabel: 'Working…',
    triggerVariant: 'outline',
    confirmVariant: 'default',
    isPending: false,
    closeOnConfirm: true,
  },
)

const emit = defineEmits<{
  confirm: []
}>()

defineSlots<{
  trigger?: () => unknown
}>()

const isOpen = defineModel<boolean>('open', { default: false })

function confirmAction(): void {
  emit('confirm')
  // AI modified: allow async owners to keep the dialog open until their mutation resolves.
  if (props.closeOnConfirm)
    isOpen.value = false
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogTrigger as-child>
      <slot name="trigger">
        <Button type="button" :variant="triggerVariant">
          {{ triggerLabel }}
        </Button>
      </slot>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">
          {{ description }}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="outline" :disabled="isPending" @click="isOpen = false">
          {{ cancelLabel }}
        </Button>
        <Button
          type="button"
          :variant="confirmVariant"
          :disabled="isPending"
          @click="confirmAction"
        >
          <LoaderCircle v-if="isPending" class="mr-2 size-4 animate-spin" aria-hidden="true" />
          {{ isPending ? pendingLabel : confirmLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
