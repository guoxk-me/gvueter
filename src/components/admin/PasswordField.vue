<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Eye, EyeOff } from '@lucide/vue'
import { shallowRef, useAttrs } from 'vue'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    id?: string
    placeholder?: string
    autocomplete?: string
    disabled?: boolean
    showLabel?: string
    hideLabel?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    placeholder: '',
    autocomplete: 'current-password',
    disabled: false,
    showLabel: 'Show password',
    hideLabel: 'Hide password',
  },
)

const password = defineModel<string>({ default: '' })
const isVisible = shallowRef(false)
// AI modified: validation and form attributes must reach the real input instead of the composite wrapper.
const inputAttrs = useAttrs()
</script>

<template>
  <InputGroup :class="props.class">
    <InputGroupInput
      v-bind="inputAttrs"
      :id="id"
      v-model="password"
      :type="isVisible ? 'text' : 'password'"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :disabled="disabled"
    />
    <InputGroupAddon align="inline-end">
      <InputGroupButton
        type="button"
        size="icon-xs"
        :aria-label="isVisible ? hideLabel : showLabel"
        :disabled="disabled"
        @click="isVisible = !isVisible"
      >
        <EyeOff v-if="isVisible" data-icon="inline-start" aria-hidden="true" />
        <Eye v-else data-icon="inline-start" aria-hidden="true" />
      </InputGroupButton>
    </InputGroupAddon>
  </InputGroup>
</template>
