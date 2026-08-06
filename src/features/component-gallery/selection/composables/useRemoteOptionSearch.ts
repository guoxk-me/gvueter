import type { Ref } from 'vue'
import type { RemoteOptionSource, SelectionOption } from '../selection-examples'
import { shallowRef, watch } from 'vue'

export type RemoteSearchPhase = 'empty' | 'error' | 'idle' | 'loading' | 'ready' | 'waiting'

export function useRemoteOptionSearch(
  source: Readonly<Ref<RemoteOptionSource>>,
  debounceMilliseconds = 250,
) {
  const query = shallowRef('')
  const options = shallowRef<readonly SelectionOption[]>([])
  const phase = shallowRef<RemoteSearchPhase>('idle')
  const retrySequence = shallowRef(0)
  let latestRequestSequence = 0

  watch(
    [query, retrySequence, source],
    ([requestedQuery], _previousValues, onCleanup) => {
      const searchTerm = requestedQuery.trim()
      latestRequestSequence += 1
      const requestSequence = latestRequestSequence
      if (!searchTerm) {
        options.value = []
        phase.value = 'idle'
        return
      }

      phase.value = 'waiting'
      const controller = new AbortController()
      const debounceTimer = window.setTimeout(async () => {
        phase.value = 'loading'
        try {
          const remoteOptions = await source.value(searchTerm, controller.signal)
          if (controller.signal.aborted || requestSequence !== latestRequestSequence) return

          // AI modified: only the newest request can publish options after rapid remote searches.
          options.value = remoteOptions
          phase.value = remoteOptions.length > 0 ? 'ready' : 'empty'
        } catch {
          if (controller.signal.aborted || requestSequence !== latestRequestSequence) return

          options.value = []
          phase.value = 'error'
        }
      }, debounceMilliseconds)

      onCleanup(() => {
        window.clearTimeout(debounceTimer)
        controller.abort()
      })
    },
    { immediate: true },
  )

  function retry(): void {
    retrySequence.value += 1
  }

  function clear(): void {
    query.value = ''
    options.value = []
    phase.value = 'idle'
  }

  return { clear, options, phase, query, retry }
}
