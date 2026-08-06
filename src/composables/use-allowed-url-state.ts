import type { MaybeRefOrGetter, Ref } from 'vue'
import type { LocationQuery, LocationQueryRaw, LocationQueryValue } from 'vue-router'
import { shallowRef, toValue, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export type UrlStateHistoryMode = 'push' | 'replace'

interface AllowedUrlStateOptions<TState extends string> {
  queryKey: string
  allowedStates: MaybeRefOrGetter<readonly TState[]>
  isReady?: MaybeRefOrGetter<boolean>
  history?: UrlStateHistoryMode
}

export interface AllowedUrlStringStateOptions<
  TState extends string,
> extends AllowedUrlStateOptions<TState> {
  kind: 'string'
  defaultState: TState
}

export interface AllowedUrlListStateOptions<
  TState extends string,
> extends AllowedUrlStateOptions<TState> {
  kind: 'list'
  defaultState?: readonly TState[]
  emptyStateToken?: string
}

type AllowedUrlStateContract<TState extends string> =
  | AllowedUrlStringStateOptions<TState>
  | AllowedUrlListStateOptions<TState>

function assertSafeQueryKey(queryKey: string): void {
  if (!/^[A-Z][\w-]{0,63}$/i.test(queryKey))
    throw new Error(`Unsafe URL state query key: ${queryKey}`)
}

function getQueryTexts(
  queryEntry: LocationQueryValue | LocationQueryValue[] | undefined,
): string[] {
  if (typeof queryEntry === 'string') return [queryEntry]
  if (!Array.isArray(queryEntry)) return []
  return queryEntry.filter((entry): entry is string => typeof entry === 'string')
}

export function getAllowedUrlStringState<TState extends string>(
  queryEntry: LocationQueryValue | LocationQueryValue[] | undefined,
  allowedStates: readonly TState[],
  defaultState: TState,
): TState {
  const queryTexts = getQueryTexts(queryEntry)
  const requestedState = queryTexts.length === 1 ? queryTexts[0] : undefined
  return requestedState && allowedStates.includes(requestedState as TState)
    ? (requestedState as TState)
    : defaultState
}

export function getAllowedUrlListState<TState extends string>(
  queryEntry: LocationQueryValue | LocationQueryValue[] | undefined,
  allowedStates: readonly TState[],
  defaultState: readonly TState[] = [],
  emptyStateToken?: string,
): readonly TState[] {
  const queryTexts = getQueryTexts(queryEntry)
  if (queryTexts.length === 0) return [...defaultState]
  if (emptyStateToken && queryTexts.length === 1 && queryTexts[0] === emptyStateToken) return []
  const acceptedStates = queryTexts.filter((requestedState): requestedState is TState =>
    allowedStates.includes(requestedState as TState),
  )
  const uniqueStates = [...new Set(acceptedStates)]
  return uniqueStates.length > 0 ? uniqueStates : [...defaultState]
}

function getComparableQueryEntry(queryEntry: LocationQueryRaw[string]): string[] {
  if (Array.isArray(queryEntry)) return queryEntry.map((entry) => String(entry ?? ''))
  if (queryEntry === undefined) return []
  return [String(queryEntry ?? '')]
}

function areQueryEntriesEqual(
  currentEntry: LocationQuery[string] | undefined,
  nextEntry: LocationQueryRaw[string],
): boolean {
  const currentTexts = getComparableQueryEntry(currentEntry)
  const nextTexts = getComparableQueryEntry(nextEntry)
  return (
    currentTexts.length === nextTexts.length &&
    currentTexts.every((queryText, index) => queryText === nextTexts[index])
  )
}

function getStringStateQuery<TState extends string>(
  currentQuery: LocationQuery,
  queryKey: string,
  state: TState,
  defaultState: TState,
): LocationQueryRaw {
  const nextQuery: LocationQueryRaw = { ...currentQuery }
  if (state === defaultState) delete nextQuery[queryKey]
  else nextQuery[queryKey] = state
  return nextQuery
}

function getListStateQuery<TState extends string>(
  currentQuery: LocationQuery,
  queryKey: string,
  states: readonly TState[],
  defaultStates: readonly TState[],
  emptyStateToken?: string,
): LocationQueryRaw {
  const nextQuery: LocationQueryRaw = { ...currentQuery }
  const isDefaultState =
    states.length === defaultStates.length &&
    states.every((state, index) => state === defaultStates[index])
  if (isDefaultState || (states.length === 0 && defaultStates.length === 0))
    delete nextQuery[queryKey]
  else if (states.length === 0 && emptyStateToken) nextQuery[queryKey] = emptyStateToken
  else nextQuery[queryKey] = [...states]
  return nextQuery
}

function useAllowedUrlStringState<TState extends string>(
  options: AllowedUrlStringStateOptions<TState>,
): Ref<TState> {
  const route = useRoute()
  const router = useRouter()
  const state = shallowRef(options.defaultState) as Ref<TState>
  let isApplyingRoute = false

  function writeState(nextState: TState, history: UrlStateHistoryMode): void {
    const nextQuery = getStringStateQuery(
      route.query,
      options.queryKey,
      nextState,
      options.defaultState,
    )
    if (areQueryEntriesEqual(route.query[options.queryKey], nextQuery[options.queryKey])) return
    void router[history]({ query: nextQuery })
  }

  watch(
    [
      () => route.query[options.queryKey],
      () => [...toValue(options.allowedStates)],
      () => options.isReady === undefined || toValue(options.isReady),
    ],
    ([queryEntry, allowedStates, isReady]) => {
      if (!isReady) return
      const routeState = getAllowedUrlStringState(queryEntry, allowedStates, options.defaultState)
      isApplyingRoute = true
      state.value = routeState
      isApplyingRoute = false
      // AI modified: malformed and unknown values are removed without discarding unrelated route state.
      writeState(routeState, 'replace')
    },
    { immediate: true, flush: 'sync' },
  )

  watch(
    state,
    (nextState) => {
      if (isApplyingRoute || (options.isReady !== undefined && !toValue(options.isReady))) return
      const allowedStates = toValue(options.allowedStates)
      const acceptedState =
        nextState === options.defaultState || allowedStates.includes(nextState)
          ? nextState
          : options.defaultState
      if (acceptedState !== nextState) {
        state.value = acceptedState
        return
      }
      writeState(acceptedState, options.history ?? 'replace')
    },
    { flush: 'sync' },
  )

  return state
}

function useAllowedUrlListState<TState extends string>(
  options: AllowedUrlListStateOptions<TState>,
): Ref<readonly TState[]> {
  const route = useRoute()
  const router = useRouter()
  const defaultState = options.defaultState ?? []
  const emptyStateToken = options.emptyStateToken
  if (emptyStateToken && !/^[\w-]{1,32}$/.test(emptyStateToken))
    throw new Error(`Unsafe URL list empty-state token: ${emptyStateToken}`)
  const states = shallowRef<readonly TState[]>([...defaultState])
  let isApplyingRoute = false

  function writeStates(nextStates: readonly TState[], history: UrlStateHistoryMode): void {
    const nextQuery = getListStateQuery(
      route.query,
      options.queryKey,
      nextStates,
      defaultState,
      emptyStateToken,
    )
    if (areQueryEntriesEqual(route.query[options.queryKey], nextQuery[options.queryKey])) return
    void router[history]({ query: nextQuery })
  }

  watch(
    [
      () => route.query[options.queryKey],
      () => [...toValue(options.allowedStates)],
      () => options.isReady === undefined || toValue(options.isReady),
    ],
    ([queryEntry, allowedStates, isReady]) => {
      if (!isReady) return
      const routeStates = getAllowedUrlListState(
        queryEntry,
        allowedStates,
        defaultState,
        emptyStateToken,
      )
      isApplyingRoute = true
      states.value = routeStates
      isApplyingRoute = false
      // AI modified: list state is deduplicated and constrained to its fixed route allowlist.
      writeStates(routeStates, 'replace')
    },
    { immediate: true, flush: 'sync' },
  )

  watch(
    states,
    (nextStates) => {
      if (isApplyingRoute || (options.isReady !== undefined && !toValue(options.isReady))) return
      const allowedStates = toValue(options.allowedStates)
      const acceptedStates = [
        ...new Set(nextStates.filter((state) => allowedStates.includes(state))),
      ]
      const safeStates = nextStates.length === 0 ? [] : acceptedStates
      const hasRejectedState =
        safeStates.length !== nextStates.length ||
        safeStates.some((state, index) => state !== nextStates[index])
      if (hasRejectedState) {
        states.value = safeStates
        return
      }
      writeStates(safeStates, options.history ?? 'replace')
    },
    { flush: 'sync' },
  )

  return states
}

export function useAllowedUrlState<TState extends string>(
  options: AllowedUrlStringStateOptions<TState>,
): Ref<TState>
export function useAllowedUrlState<TState extends string>(
  options: AllowedUrlListStateOptions<TState>,
): Ref<readonly TState[]>
export function useAllowedUrlState<TState extends string>(
  options: AllowedUrlStateContract<TState>,
): Ref<TState> | Ref<readonly TState[]> {
  assertSafeQueryKey(options.queryKey)
  return options.kind === 'string'
    ? useAllowedUrlStringState(options)
    : useAllowedUrlListState(options)
}
