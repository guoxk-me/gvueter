<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import type { CascaderOption } from '../selection-examples'
import { computed, watch } from 'vue'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CascaderLevel {
  options: readonly CascaderOption[]
  selectedValue: string | undefined
}

const props = defineProps<{
  options: readonly CascaderOption[]
  label: string
  levelLabels: readonly string[]
  placeholder: string
  emptyLabel: string
}>()

const selectedPath = defineModel<string[]>({ default: () => [] })

const levels = computed<CascaderLevel[]>(() => {
  const availableLevels: CascaderLevel[] = []
  let availableOptions = props.options
  let depth = 0

  while (availableOptions.length > 0) {
    const selectedValue = selectedPath.value[depth]
    availableLevels.push({ options: availableOptions, selectedValue })
    const selectedOption = availableOptions.find(option => option.value === selectedValue)
    if (!selectedOption?.children?.length)
      break

    availableOptions = selectedOption.children
    depth += 1
  }

  return availableLevels
})

const selectedLabels = computed(() => {
  const labels: string[] = []
  let availableOptions = props.options
  for (const selectedValue of selectedPath.value) {
    const selectedOption = availableOptions.find(option => option.value === selectedValue)
    if (!selectedOption)
      break
    labels.push(selectedOption.label)
    availableOptions = selectedOption.children ?? []
  }
  return labels
})

watch(
  () => props.options,
  () => {
    const availablePath: string[] = []
    let availableOptions = props.options
    for (const selectedValue of selectedPath.value) {
      const selectedOption = availableOptions.find(
        option => option.value === selectedValue && !option.disabled,
      )
      if (!selectedOption)
        break
      availablePath.push(selectedValue)
      availableOptions = selectedOption.children ?? []
    }
    if (availablePath.length !== selectedPath.value.length)
      selectedPath.value = availablePath
  },
  { deep: true, immediate: true },
)

function selectLevel(levelIndex: number, nextValue: AcceptableValue): void {
  if (typeof nextValue !== 'string')
    return

  const selectedOption = levels.value[levelIndex]?.options.find(
    option => option.value === nextValue,
  )
  if (!selectedOption || selectedOption.disabled)
    return

  // AI modified: changing an ancestor clears every stale descendant before the new path is emitted.
  selectedPath.value = [...selectedPath.value.slice(0, levelIndex), nextValue]
}
</script>

<template>
  <fieldset class="min-w-0 space-y-3">
    <legend class="text-sm font-medium">
      {{ label }}
    </legend>
    <div class="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="(level, levelIndex) in levels" :key="levelIndex" class="min-w-0 space-y-1.5">
        <!-- AI modified: the custom Select trigger already owns this level's accessible name. -->
        <p class="text-xs font-medium text-muted-foreground">
          {{ levelLabels[levelIndex] ?? `${levelIndex + 1}` }}
        </p>
        <Select
          :model-value="level.selectedValue"
          @update:model-value="selectLevel(levelIndex, $event)"
        >
          <SelectTrigger class="w-full" :aria-label="levelLabels[levelIndex] ?? label">
            <SelectValue :placeholder="placeholder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="option in level.options"
              :key="option.value"
              :value="option.value"
              :disabled="option.disabled"
            >
              {{ option.label }}
            </SelectItem>
            <SelectItem v-if="level.options.length === 0" value="__empty__" disabled>
              {{ emptyLabel }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <p class="break-words text-xs text-muted-foreground" role="status" aria-live="polite">
      {{ selectedLabels.length ? selectedLabels.join(' / ') : placeholder }}
    </p>
  </fieldset>
</template>
