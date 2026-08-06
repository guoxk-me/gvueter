<script setup lang="ts">
import { LoaderCircle } from '@lucide/vue'
import { nextTick, onBeforeUnmount, useId, useTemplateRef } from 'vue'
import { Button } from '@/components/ui/button'
import Dialog from './Dialog.vue'
import { focusFirstInvalidControl } from './form-focus'

withDefaults(
  defineProps<{
    title: string
    description?: string
    submitLabel?: string
    submittingLabel?: string
    cancelLabel?: string
    isSubmitting?: boolean
  }>(),
  {
    description: '',
    submitLabel: 'Save',
    submittingLabel: 'Saving…',
    cancelLabel: 'Cancel',
    isSubmitting: false,
  },
)

const emit = defineEmits<{
  submit: []
}>()

defineSlots<{
  default?: () => unknown
  footer?: (props: { close: () => void }) => unknown
}>()

const isOpen = defineModel<boolean>('open', { default: false })
const formId = useId()
const formElement = useTemplateRef<HTMLFormElement>('formElement')
let invalidFocusTimer: number | undefined

async function submitDialog(): Promise<void> {
  emit('submit')
  await nextTick()

  if (invalidFocusTimer !== undefined) window.clearTimeout(invalidFocusTimer)

  // AI modified: the shared form boundary waits for schema errors to render before moving focus.
  invalidFocusTimer = window.setTimeout(focusFirstInvalidControl, 0, formElement.value)
}

function closeDialog(): void {
  // AI modified: keep the parent as the source of truth for mutation state while closing via v-model.
  isOpen.value = false
}

onBeforeUnmount(() => {
  if (invalidFocusTimer !== undefined) window.clearTimeout(invalidFocusTimer)
})
</script>

<template>
  <Dialog v-model:open="isOpen" :title="title" :description="description" size="sm">
    <form
      :id="formId"
      ref="formElement"
      class="space-y-4"
      novalidate
      @submit.prevent="submitDialog"
    >
      <slot />
    </form>
    <template #footer>
      <slot name="footer" :close="closeDialog">
        <Button type="button" variant="outline" :disabled="isSubmitting" @click="closeDialog">
          {{ cancelLabel }}
        </Button>
        <!-- AI modified: associate the external footer action with the dialog's form explicitly. -->
        <Button type="submit" :form="formId" :disabled="isSubmitting">
          <LoaderCircle v-if="isSubmitting" class="mr-2 size-4 animate-spin" aria-hidden="true" />
          {{ isSubmitting ? submittingLabel : submitLabel }}
        </Button>
      </slot>
    </template>
  </Dialog>
</template>
