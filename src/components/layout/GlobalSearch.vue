<script setup lang="ts">
import { Search } from '@lucide/vue'
import { computed, nextTick, onMounted, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { canAccess } from '@/lib/ability'
import { adminNavigationItems } from '@/router/admin-navigation'

const props = withDefaults(
  defineProps<{
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)

const emit = defineEmits<{
  widthReserveChange: [width: number]
}>()

const router = useRouter()
const { locale, t } = useI18n()
const fullTriggerMeasurement = useTemplateRef<HTMLSpanElement>('fullTriggerMeasurement')
const open = shallowRef(false)
const query = shallowRef('')
let measurementResizeObserver: ResizeObserver | undefined
let hasWindowResizeFallback = false

const filteredItems = computed(() => {
  const q = query.value.trim().toLowerCase()
  return adminNavigationItems.filter((item) => {
    if (!canAccess(item.ability[0], item.ability[1])) return false
    if (!q) return true
    return t(item.labelKey).toLowerCase().includes(q)
  })
})
const triggerClass = computed(() => [
  'flex h-8 items-center rounded-md border border-input bg-background text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground',
  // AI modified: reclaim navigation width without changing the search command or its readable name.
  props.compact ? 'size-8 justify-center px-0' : 'gap-2 px-3',
])

function select(item: (typeof adminNavigationItems)[number]): void {
  open.value = false
  query.value = ''
  void router.push(item.to)
}

function onKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault()
    open.value = true
  }
}

function reportFullWidthReserve(): void {
  const measurement = fullTriggerMeasurement.value
  if (!measurement) return
  const fullWidth = measurement.getBoundingClientRect().width || measurement.offsetWidth
  if (fullWidth <= 0) return
  emit('widthReserveChange', Math.max(0, Math.ceil(fullWidth) - 32))
}

watch(locale, () => void nextTick(reportFullWidthReserve), { flush: 'post' })

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  void nextTick(() => {
    reportFullWidthReserve()
    if (typeof ResizeObserver === 'function' && fullTriggerMeasurement.value) {
      measurementResizeObserver = new ResizeObserver(reportFullWidthReserve)
      measurementResizeObserver.observe(fullTriggerMeasurement.value)
      return
    }
    window.addEventListener('resize', reportFullWidthReserve)
    hasWindowResizeFallback = true
  })
  void document.fonts?.ready.then(reportFullWidthReserve)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  measurementResizeObserver?.disconnect()
  if (hasWindowResizeFallback) window.removeEventListener('resize', reportFullWidthReserve)
})
</script>

<template>
  <div class="relative shrink-0">
    <!-- Trigger button -->
    <button
      :class="triggerClass"
      :aria-label="t('search.open')"
      :title="t('search.open')"
      :data-compact="props.compact ? 'true' : undefined"
      @click="open = true"
    >
      <Search class="size-3.5" aria-hidden="true" />
      <span v-if="!props.compact" class="hidden lg:inline">{{ t('search.placeholder') }}</span>
      <kbd
        v-if="!props.compact"
        class="hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium lg:flex"
      >
        <span class="text-xs">⌘</span>K
      </kbd>
    </button>

    <span
      ref="fullTriggerMeasurement"
      aria-hidden="true"
      class="pointer-events-none absolute right-0 top-0 inline-flex h-8 w-max items-center gap-2 rounded-md border px-3 text-sm invisible"
      data-search-full-measure
    >
      <Search class="size-3.5" aria-hidden="true" />
      <span>{{ t('search.placeholder') }}</span>
      <kbd
        class="flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium"
      >
        <span class="text-xs">⌘</span>K
      </kbd>
    </span>
  </div>

  <!-- Search Dialog -->
  <Dialog v-model:open="open">
    <DialogContent class="max-w-md p-0 gap-0">
      <DialogHeader class="sr-only">
        <DialogTitle>{{ t('search.title') }}</DialogTitle>
        <DialogDescription>{{ t('search.description') }}</DialogDescription>
      </DialogHeader>

      <!-- Input -->
      <div class="flex items-center border-b px-3">
        <Search class="mr-2 size-4 shrink-0 text-muted-foreground" />
        <!-- AI modified: the search field exposes a stable form name, purpose, and accessible name. -->
        <input
          v-model="query"
          type="search"
          name="global-search"
          class="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          :aria-label="t('search.title')"
          :placeholder="t('search.placeholder')"
          autofocus
        />
      </div>

      <!-- Results -->
      <div class="max-h-72 overflow-y-auto p-2">
        <p v-if="filteredItems.length === 0" class="py-6 text-center text-sm text-muted-foreground">
          {{ t('search.empty') }}
        </p>
        <button
          v-for="item in filteredItems"
          :key="item.to"
          class="flex min-w-0 w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground"
          @click="select(item)"
        >
          <!-- AI modified: each result keeps its icon visible while both translated labels truncate explicitly. -->
          <component
            :is="item.icon"
            class="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span class="min-w-0 flex-1 truncate" :title="t(item.labelKey)">
            {{ t(item.labelKey) }}
          </span>
          <span
            class="max-w-[40%] shrink-0 truncate text-xs text-muted-foreground"
            :title="t(item.groupKey)"
          >
            {{ t(item.groupKey) }}
          </span>
        </button>
      </div>
    </DialogContent>
  </Dialog>
</template>
