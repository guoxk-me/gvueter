<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { TagInputRejection } from './tag-input'
import { X } from '@lucide/vue'
import { useFocus } from '@vueuse/core'
import { computed, shallowRef, useTemplateRef } from 'vue'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    id?: string
    placeholder?: string
    maxTags?: number
    disabled?: boolean
    removeLabel?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    placeholder: 'Add a tag',
    maxTags: Number.POSITIVE_INFINITY,
    disabled: false,
    removeLabel: 'Remove tag',
  },
)

const emit = defineEmits<{
  rejected: [rejections: TagInputRejection[]]
}>()

defineSlots<{
  tag?: (props: { tag: string, remove: () => void }) => unknown
}>()

const tags = defineModel<string[]>({ default: () => [] })
const draftTag = shallowRef('')
const inputRef = useTemplateRef<HTMLInputElement>('tagInput')
const { focused } = useFocus(inputRef, { preventScroll: true })
const isAtLimit = computed(() => tags.value.length >= Math.max(props.maxTags, 0))

function addDraftTag(): void {
  if (!draftTag.value.trim()) {
    draftTag.value = ''
    return
  }

  addTags(draftTag.value.split(','))
  draftTag.value = ''
}

function addTags(candidateTags: readonly string[]): void {
  if (props.disabled)
    return

  const acceptedTags: string[] = []
  const rejections: TagInputRejection[] = []
  const existingTags = new Set(tags.value.map(tag => tag.toLocaleLowerCase()))

  for (const candidate of candidateTags) {
    const tag = candidate.trim()
    const comparableTag = tag.toLocaleLowerCase()
    if (!tag) {
      rejections.push({ value: candidate, reason: 'empty' })
      continue
    }
    if (tags.value.length + acceptedTags.length >= Math.max(props.maxTags, 0)) {
      rejections.push({ value: tag, reason: 'max-tags' })
      continue
    }
    if (existingTags.has(comparableTag)) {
      rejections.push({ value: tag, reason: 'duplicate' })
      continue
    }

    acceptedTags.push(tag)
    existingTags.add(comparableTag)
  }

  // AI modified: replace the tag array so controlled parents and form libraries observe each accepted batch once.
  if (acceptedTags.length > 0)
    tags.value = [...tags.value, ...acceptedTags]
  if (rejections.length > 0)
    emit('rejected', rejections)
}

function removeTag(tagToRemove: string): void {
  tags.value = tags.value.filter(tag => tag !== tagToRemove)
  focused.value = true
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    addDraftTag()
    return
  }

  if (event.key === 'Backspace' && draftTag.value.length === 0) {
    const lastTag = tags.value[tags.value.length - 1]
    if (lastTag)
      removeTag(lastTag)
  }
}

function handlePaste(event: ClipboardEvent): void {
  const pastedText = event.clipboardData?.getData('text')
  if (!pastedText)
    return

  event.preventDefault()
  addTags(pastedText.split(','))
}

function focusInput(): void {
  if (!props.disabled && !isAtLimit.value)
    focused.value = true
}
</script>

<template>
  <div
    :class="
      cn(
        'border-input focus-within:border-ring focus-within:ring-ring/50 flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border bg-transparent px-2 py-1 shadow-xs focus-within:ring-[3px]',
        props.class,
      )
    "
    @click="focusInput"
  >
    <span
      v-for="tag in tags"
      :key="tag"
      class="inline-flex h-6 items-center gap-1 rounded-sm bg-secondary px-1.5 text-xs font-medium text-secondary-foreground"
    >
      <slot name="tag" :tag="tag" :remove="() => removeTag(tag)">
        {{ tag }}
      </slot>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        class="-mr-1 size-5 rounded-sm p-0 hover:bg-secondary-foreground/10"
        :aria-label="`${removeLabel}: ${tag}`"
        :disabled="disabled"
        @click.stop="removeTag(tag)"
      >
        <X class="size-3" aria-hidden="true" />
      </Button>
    </span>
    <input
      :id="id"
      ref="tagInput"
      v-model="draftTag"
      class="placeholder:text-muted-foreground h-6 min-w-24 flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed"
      :placeholder="isAtLimit ? '' : placeholder"
      :disabled="disabled || isAtLimit"
      @keydown="handleKeydown"
      @paste="handlePaste"
      @blur="addDraftTag"
    >
  </div>
</template>
