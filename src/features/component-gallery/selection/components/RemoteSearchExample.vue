<script setup lang="ts">
import type { RemoteOptionSource, SelectionOption } from '../selection-examples'
import { Check, LoaderCircle, Search, X } from '@lucide/vue'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { useRemoteOptionSearch } from '../composables/useRemoteOptionSearch'

const props = defineProps<{
  searchOptions?: RemoteOptionSource
}>()

const { locale } = useI18n()
const copy = computed(() =>
  locale.value.startsWith('zh')
    ? {
        label: '远程员工搜索',
        placeholder: '输入姓名、邮箱或技能',
        idle: '输入关键词后发起搜索；请求会延迟 250ms，并取消过期请求。',
        waiting: '等待输入稳定…',
        loading: '正在查询员工目录…',
        empty: '没有匹配员工。可清空后重试其他关键词。',
        error: '员工目录暂时不可用。',
        retry: '重试',
        clear: '清空远程搜索',
        selected: '已选择',
        scenarios: '示例状态',
        successScenario: '成功',
        emptyScenario: '空结果',
        errorScenario: '错误',
      }
    : {
        label: 'Remote employee search',
        placeholder: 'Search by name, email, or skill',
        idle: 'Type to search after a 250 ms debounce; obsolete requests are cancelled.',
        waiting: 'Waiting for input to settle…',
        loading: 'Searching the employee directory…',
        empty: 'No employees match. Clear the query and try another term.',
        error: 'The employee directory is temporarily unavailable.',
        retry: 'Retry',
        clear: 'Clear remote search',
        selected: 'Selected',
        scenarios: 'Example states',
        successScenario: 'Success',
        emptyScenario: 'Empty',
        errorScenario: 'Error',
      },
)

const directory = computed<readonly SelectionOption[]>(() =>
  locale.value.startsWith('zh')
    ? [
        { value: 'u-101', label: '林晓月', description: '产品设计 · 无障碍' },
        { value: 'u-102', label: '陈思远', description: '数据平台 · 分析' },
        { value: 'u-103', label: '吴雪', description: '安全工程 · 风险治理' },
        { value: 'u-104', label: '郑航', description: '前端平台 · Vue' },
      ]
    : [
        { value: 'u-101', label: 'Luna Lin', description: 'Product design · Accessibility' },
        { value: 'u-102', label: 'Ethan Chen', description: 'Data platform · Analytics' },
        { value: 'u-103', label: 'Iris Wu', description: 'Security engineering · Risk governance' },
        { value: 'u-104', label: 'Henry Zheng', description: 'Frontend platform · Vue' },
      ],
)

function waitForDirectory(delay: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, delay)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer)
        reject(new DOMException('The directory request was aborted.', 'AbortError'))
      },
      { once: true },
    )
  })
}

const demoSource = computed<RemoteOptionSource>(() => async (query, signal) => {
  await waitForDirectory(query.toLocaleLowerCase() === 'slow' ? 700 : 320, signal)
  if (query.toLocaleLowerCase() === 'error') throw new Error('Simulated directory outage')

  const requestedText = query.toLocaleLowerCase()
  return directory.value.filter((option) =>
    `${option.label} ${option.description ?? ''}`.toLocaleLowerCase().includes(requestedText),
  )
})
const activeSource = computed<RemoteOptionSource>(() => props.searchOptions ?? demoSource.value)
const { clear, options, phase, query, retry } = useRemoteOptionSearch(activeSource)
const selectedOption = shallowRef<SelectionOption>()

function chooseOption(option: SelectionOption): void {
  selectedOption.value = option
}

function clearSearch(): void {
  selectedOption.value = undefined
  clear()
}
</script>

<template>
  <div class="min-w-0 space-y-3">
    <div class="flex min-w-0 flex-wrap gap-2" :aria-label="copy.scenarios">
      <Button
        type="button"
        size="sm"
        variant="outline"
        @click="query = locale.startsWith('zh') ? '林' : 'Luna'"
      >
        {{ copy.successScenario }}
      </Button>
      <Button type="button" size="sm" variant="outline" @click="query = 'no-match-2849'">
        {{ copy.emptyScenario }}
      </Button>
      <Button type="button" size="sm" variant="outline" @click="query = 'error'">
        {{ copy.errorScenario }}
      </Button>
    </div>

    <div class="relative min-w-0">
      <Search
        class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        v-model="query"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-controls="remote-directory-results"
        :aria-expanded="phase === 'ready'"
        :aria-label="copy.label"
        :placeholder="copy.placeholder"
        class="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full min-w-0 rounded-md border bg-transparent py-2 pr-11 pl-9 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
      />
      <Button
        v-if="query || selectedOption"
        type="button"
        variant="ghost"
        size="icon-sm"
        class="absolute top-1 right-1"
        :aria-label="copy.clear"
        :title="copy.clear"
        @click="clearSearch"
      >
        <X class="size-4" aria-hidden="true" />
      </Button>
    </div>

    <div class="min-h-20 rounded-lg border bg-muted/20 p-2">
      <p v-if="phase === 'idle'" class="px-2 py-3 text-sm text-muted-foreground" role="status">
        {{ copy.idle }}
      </p>
      <p
        v-else-if="phase === 'waiting'"
        class="px-2 py-3 text-sm text-muted-foreground"
        role="status"
      >
        {{ copy.waiting }}
      </p>
      <p
        v-else-if="phase === 'loading'"
        class="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground"
        role="status"
      >
        <LoaderCircle class="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        {{ copy.loading }}
      </p>
      <p
        v-else-if="phase === 'empty'"
        class="px-2 py-3 text-sm text-muted-foreground"
        role="status"
      >
        {{ copy.empty }}
      </p>
      <div
        v-else-if="phase === 'error'"
        class="flex min-w-0 flex-wrap items-center justify-between gap-2 px-2 py-2"
        role="alert"
      >
        <p class="break-words text-sm text-destructive">
          {{ copy.error }}
        </p>
        <Button type="button" size="sm" variant="outline" @click="retry">
          {{ copy.retry }}
        </Button>
      </div>
      <div v-else id="remote-directory-results" role="listbox" :aria-label="copy.label">
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          role="option"
          :aria-selected="selectedOption?.value === option.value"
          class="focus-visible:ring-ring flex w-full min-w-0 items-start gap-2 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2"
          @click="chooseOption(option)"
        >
          <Check
            class="mt-0.5 size-4 shrink-0 text-primary"
            :class="selectedOption?.value === option.value ? 'opacity-100' : 'opacity-0'"
            aria-hidden="true"
          />
          <span class="min-w-0">
            <span class="block break-words font-medium">{{ option.label }}</span>
            <span
              v-if="option.description"
              class="block break-words text-xs text-muted-foreground"
              >{{ option.description }}</span
            >
          </span>
        </button>
      </div>
    </div>

    <p data-testid="remote-search-phase" class="sr-only" aria-live="polite">
      {{ phase }}
    </p>
    <p v-if="selectedOption" class="break-words text-sm" role="status" aria-live="polite">
      <span class="font-medium">{{ copy.selected }}:</span> {{ selectedOption.label }}
    </p>
  </div>
</template>
