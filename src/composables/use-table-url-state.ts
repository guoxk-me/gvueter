import type { PaginationState, SortingState } from '@tanstack/vue-table'
import type { Ref } from 'vue'
import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getAcceptedPageSize,
  getAllowedPageSizes,
} from '@/components/data-table/pagination-contract'

type StringFilterRecord = Record<string, string>
type StringFilterKey<TFilters extends StringFilterRecord> = Extract<keyof TFilters, string>

export interface TableUrlFilterRule<TFilter extends string> {
  queryKey: string
  acceptedValues?: readonly TFilter[]
}

export type TableUrlFilterRules<TFilters extends StringFilterRecord> = {
  [TFilterKey in StringFilterKey<TFilters>]: TableUrlFilterRule<TFilters[TFilterKey]>
}

export interface TableUrlContract<TFilters extends StringFilterRecord> {
  defaultFilters: TFilters
  defaultPagination: PaginationState
  defaultSorting: SortingState
  filterRules: TableUrlFilterRules<TFilters>
  pageSizeOptions: readonly number[]
  sortColumnIds: readonly string[]
}

export interface TableUrlState<TFilters extends StringFilterRecord> {
  filters: TFilters
  pagination: PaginationState
  sorting: SortingState
}

interface UseTableUrlStateOptions<
  TFilters extends StringFilterRecord,
> extends TableUrlContract<TFilters> {
  filters: Ref<TFilters>
  pagination: Ref<PaginationState>
  sorting: Ref<SortingState>
}

function getSingleQueryText(queryEntry: LocationQuery[string] | undefined): string | undefined {
  return typeof queryEntry === 'string' ? queryEntry : undefined
}

function getPositiveInteger(queryEntry: LocationQuery[string] | undefined): number | undefined {
  const queryText = getSingleQueryText(queryEntry)
  if (!queryText || !/^\d+$/.test(queryText)) return undefined

  const integer = Number(queryText)
  return Number.isSafeInteger(integer) && integer > 0 ? integer : undefined
}

function getAcceptedSorting(
  query: LocationQuery,
  contract: TableUrlContract<StringFilterRecord>,
): SortingState {
  const sortBy = getSingleQueryText(query.sortBy)
  if (sortBy === 'none') return []

  const sortOrder = getSingleQueryText(query.sortOrder)
  if (
    !sortBy ||
    !contract.sortColumnIds.includes(sortBy) ||
    !['asc', 'desc'].includes(sortOrder ?? '')
  )
    return contract.defaultSorting.map((columnSort) => ({ ...columnSort }))

  return [{ id: sortBy, desc: sortOrder === 'desc' }]
}

function arePaginationStatesEqual(left: PaginationState, right: PaginationState): boolean {
  return left.pageIndex === right.pageIndex && left.pageSize === right.pageSize
}

function areSortingStatesEqual(left: SortingState, right: SortingState): boolean {
  return (
    left.length === right.length &&
    left.every((columnSort, index) => {
      const comparedSort = right[index]
      return comparedSort?.id === columnSort.id && comparedSort.desc === columnSort.desc
    })
  )
}

function areFilterStatesEqual<TFilters extends StringFilterRecord>(
  left: TFilters,
  right: TFilters,
): boolean {
  const filterNames = Object.keys(left) as Array<StringFilterKey<TFilters>>
  return (
    filterNames.length === Object.keys(right).length &&
    filterNames.every((filterName) => left[filterName] === right[filterName])
  )
}

function getComparableQueryEntry(queryEntry: LocationQueryRaw[string]): string {
  if (Array.isArray(queryEntry))
    return queryEntry.map((entry) => String(entry ?? '')).join('\u0000')
  return String(queryEntry ?? '')
}

function areQueriesEqual(currentQuery: LocationQuery, nextQuery: LocationQueryRaw): boolean {
  const currentKeys = Object.keys(currentQuery).sort()
  const nextKeys = Object.keys(nextQuery)
    .filter((queryKey) => nextQuery[queryKey] !== undefined)
    .sort()

  return (
    currentKeys.length === nextKeys.length &&
    currentKeys.every((queryKey, index) => {
      return (
        queryKey === nextKeys[index] &&
        getComparableQueryEntry(currentQuery[queryKey]) ===
          getComparableQueryEntry(nextQuery[queryKey])
      )
    })
  )
}

export function getTableUrlState<TFilters extends StringFilterRecord>(
  query: LocationQuery,
  contract: TableUrlContract<TFilters>,
): TableUrlState<TFilters> {
  const allowedPageSizes = getAllowedPageSizes(contract.pageSizeOptions)
  const defaultPageSize =
    getAcceptedPageSize(contract.defaultPagination.pageSize, allowedPageSizes) ??
    allowedPageSizes[0]!
  const pageSize =
    getAcceptedPageSize(getSingleQueryText(query.pageSize), allowedPageSizes) ?? defaultPageSize
  const pageNumber = getPositiveInteger(query.page)
  const filters = { ...contract.defaultFilters }

  for (const filterName of Object.keys(contract.filterRules) as Array<StringFilterKey<TFilters>>) {
    const rule = contract.filterRules[filterName]
    const filterText = getSingleQueryText(query[rule.queryKey])
    const isAccepted =
      filterText !== undefined &&
      (!rule.acceptedValues ||
        rule.acceptedValues.includes(filterText as TFilters[typeof filterName]))
    if (isAccepted) filters[filterName] = filterText as TFilters[typeof filterName]
  }

  return {
    filters,
    pagination: {
      pageIndex: pageNumber ? pageNumber - 1 : Math.max(contract.defaultPagination.pageIndex, 0),
      pageSize,
    },
    sorting: getAcceptedSorting(query, contract),
  }
}

export function getTableUrlQuery<TFilters extends StringFilterRecord>(
  currentQuery: LocationQuery,
  state: TableUrlState<TFilters>,
  contract: TableUrlContract<TFilters>,
): LocationQueryRaw {
  const nextQuery: LocationQueryRaw = { ...currentQuery }
  const controlledKeys = [
    'page',
    'pageSize',
    'sortBy',
    'sortOrder',
    ...Object.values(contract.filterRules).map((rule) => rule.queryKey),
  ]
  for (const queryKey of controlledKeys) delete nextQuery[queryKey]

  if (state.pagination.pageIndex !== contract.defaultPagination.pageIndex)
    nextQuery.page = String(state.pagination.pageIndex + 1)
  if (state.pagination.pageSize !== contract.defaultPagination.pageSize)
    nextQuery.pageSize = String(state.pagination.pageSize)

  if (!areSortingStatesEqual(state.sorting, contract.defaultSorting)) {
    const activeSort = state.sorting[0]
    nextQuery.sortBy = activeSort?.id ?? 'none'
    if (activeSort) nextQuery.sortOrder = activeSort.desc ? 'desc' : 'asc'
  }

  for (const filterName of Object.keys(contract.filterRules) as Array<StringFilterKey<TFilters>>) {
    const filterText = state.filters[filterName]
    if (filterText !== contract.defaultFilters[filterName])
      nextQuery[contract.filterRules[filterName].queryKey] = filterText
  }

  return nextQuery
}

export function useTableUrlState<TFilters extends StringFilterRecord>(
  options: UseTableUrlStateOptions<TFilters>,
): void {
  const route = useRoute()
  const router = useRouter()

  function replaceChangedQuery(): void {
    const nextQuery = getTableUrlQuery(
      route.query,
      {
        filters: options.filters.value,
        pagination: options.pagination.value,
        sorting: options.sorting.value,
      },
      options,
    )
    if (!areQueriesEqual(route.query, nextQuery)) void router.replace({ query: nextQuery })
  }

  watch(
    () => route.query,
    (query) => {
      const routeState = getTableUrlState(query, options)

      // AI modified: same-route history navigation must update the reused page instance.
      if (!arePaginationStatesEqual(options.pagination.value, routeState.pagination))
        options.pagination.value = routeState.pagination
      if (!areSortingStatesEqual(options.sorting.value, routeState.sorting))
        options.sorting.value = routeState.sorting
      if (!areFilterStatesEqual(options.filters.value, routeState.filters))
        options.filters.value = routeState.filters

      replaceChangedQuery()
    },
    { immediate: true },
  )

  watch([options.pagination, options.sorting, options.filters], replaceChangedQuery, {
    deep: true,
    flush: 'post',
  })
}
