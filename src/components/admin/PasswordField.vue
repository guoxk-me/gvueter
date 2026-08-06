<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue'
import { shallowRef } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

withDefaults(
  defineProps<{
    id?: string
    placeholder?: string
    autocomplete?: string
    disabled?: boolean
    showLabel?: string
    hideLabel?: string
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
</script>

<template>
  <div class="relative">
    <Input
      :id="id"
      v-model="password"
      :type="isVisible ? 'text' : 'password'"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :disabled="disabled"
      class="pr-10"
    />
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      class="absolute top-1/2 right-1 -translate-y-1/2"
      :aria-label="isVisible ? hideLabel : showLabel"
      :disabled="disabled"
      @click="isVisible = !isVisible"
    >
      <EyeOff v-if="isVisible" class="size-4" aria-hidden="true" />
      <Eye v-else class="size-4" aria-hidden="true" />
    </Button>
  </div>
</template>
