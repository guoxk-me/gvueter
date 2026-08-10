<script setup lang="ts">
import { ExternalLink, LoaderCircle, RefreshCw, TriangleAlert } from '@lucide/vue'
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

defineOptions({ name: 'IframePage' })

type IframeLoadState = 'loading' | 'ready' | 'error' | 'timeout'

const IFRAME_LOAD_TIMEOUT_MS = 15_000

const route = useRoute()
const { t } = useI18n()

const iframeUrl = computed(() => route.meta.iframeUrl ?? '')
const iframeTitle = computed(() =>
  route.meta.titleKey ? t(route.meta.titleKey) : (route.meta.title ?? 'Embedded page'),
)
const iframeSource = computed(() => {
  if (!iframeUrl.value) return t('nav.iframePage.unknownSource')

  try {
    return new URL(iframeUrl.value, window.location.origin).origin
  } catch {
    return t('nav.iframePage.unknownSource')
  }
})
const frameState = shallowRef<IframeLoadState>('loading')
const frameRevision = shallowRef(0)
const frameKey = computed(() => `${iframeUrl.value}:${frameRevision.value}`)
const isFrameReady = computed(() => frameState.value === 'ready')
const frameStatusLabel = computed(() => t(`nav.iframePage.states.${frameState.value}`))

let loadTimeout: ReturnType<typeof setTimeout> | null = null

function clearLoadTimeout(): void {
  if (loadTimeout === null) return

  clearTimeout(loadTimeout)
  loadTimeout = null
}

function beginFrameLoad(): void {
  clearLoadTimeout()
  frameState.value = 'loading'

  if (!iframeUrl.value) {
    frameState.value = 'error'
    return
  }

  // AI modified: iframe error events are not reliable across browsers, so loading always has a timeout fallback.
  loadTimeout = setTimeout(() => {
    if (frameState.value === 'loading') frameState.value = 'timeout'
    loadTimeout = null
  }, IFRAME_LOAD_TIMEOUT_MS)
}

function refreshFrame(): void {
  // AI modified: remounting guarantees Refresh and Retry reload an unchanged source instead of reusing stale frame state.
  frameRevision.value += 1
  beginFrameLoad()
}

function markFrameReady(): void {
  if (!iframeUrl.value) return

  clearLoadTimeout()
  frameState.value = 'ready'
}

function markFrameError(): void {
  clearLoadTimeout()
  frameState.value = 'error'
}

watch(
  iframeUrl,
  () => {
    frameRevision.value += 1
    beginFrameLoad()
  },
  { immediate: true },
)

onBeforeUnmount(clearLoadTimeout)
</script>

<template>
  <section
    class="flex h-full min-h-[32rem] flex-col overflow-hidden rounded-lg border border-border bg-background"
    :aria-busy="frameState === 'loading'"
    :aria-label="iframeTitle"
  >
    <header class="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-xs font-medium text-muted-foreground">
            {{ t('nav.iframePage.sourceNotice', { source: iframeSource }) }}
          </p>
          <!-- AI modified: the shared badge exposes the frame state without duplicating status styling. -->
          <Badge variant="secondary" role="status" aria-live="polite">
            {{ frameStatusLabel }}
          </Badge>
        </div>
        <p class="mt-1 truncate text-sm" :title="iframeUrl">
          {{ iframeUrl || t('nav.iframePage.unknownSource') }}
        </p>
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          :aria-label="t('nav.iframePage.refresh')"
          @click="refreshFrame"
        >
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
          {{ t('common.refresh') }}
        </Button>
        <Button
          v-if="iframeUrl"
          as="a"
          variant="outline"
          size="sm"
          :href="iframeUrl"
          target="_blank"
          rel="noopener noreferrer"
          :aria-label="t('nav.iframePage.openInNewWindow')"
        >
          <ExternalLink data-icon="inline-start" aria-hidden="true" />
          {{ t('nav.iframePage.openInNewWindow') }}
        </Button>
      </div>
    </header>
    <!-- AI modified: the shared separator defines the boundary between controls and embedded content. -->
    <Separator />

    <div class="relative min-h-0 flex-1">
      <iframe
        v-if="iframeUrl"
        :key="frameKey"
        :src="iframeUrl"
        :title="iframeTitle"
        class="h-full min-h-[27rem] w-full border-0"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        sandbox="allow-forms allow-popups allow-scripts"
        :tabindex="isFrameReady ? 0 : -1"
        :aria-hidden="!isFrameReady"
        @load="markFrameReady"
        @error="markFrameError"
      />

      <div
        v-if="frameState !== 'ready'"
        class="absolute inset-0 z-10 flex items-center justify-center bg-background/95 p-6 text-center"
        :role="frameState === 'loading' ? 'status' : 'alert'"
        :aria-live="frameState === 'loading' ? 'polite' : 'assertive'"
        aria-atomic="true"
      >
        <div class="max-w-md space-y-3">
          <template v-if="frameState === 'loading'">
            <LoaderCircle
              class="mx-auto size-7 animate-spin text-muted-foreground motion-reduce:animate-none"
              aria-hidden="true"
            />
            <h2 class="font-semibold">
              {{ t('nav.iframePage.loadingTitle') }}
            </h2>
            <p class="text-sm text-muted-foreground">
              {{ t('nav.iframePage.loadingDescription') }}
            </p>
          </template>

          <template v-else>
            <TriangleAlert class="mx-auto size-7 text-destructive" aria-hidden="true" />
            <h2 class="font-semibold">
              {{
                frameState === 'timeout'
                  ? t('nav.iframePage.timeoutTitle')
                  : t('nav.iframePage.errorTitle')
              }}
            </h2>
            <p class="text-sm text-muted-foreground">
              {{
                frameState === 'timeout'
                  ? t('nav.iframePage.timeoutDescription')
                  : t('nav.iframePage.errorDescription')
              }}
            </p>
            <Button type="button" variant="outline" @click="refreshFrame">
              <RefreshCw data-icon="inline-start" aria-hidden="true" />
              {{ t('common.retry') }}
            </Button>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>
