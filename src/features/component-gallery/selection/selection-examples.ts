import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type { DateRangeValue } from '@/components/admin/date-range'

export type ExampleStatus = 'active' | 'all' | 'paused'
export type ExampleRegion = 'all' | 'americas' | 'asia' | 'europe'

export interface SelectionOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export interface CascaderOption extends SelectionOption {
  children?: readonly CascaderOption[]
}

export interface SelectionFilters {
  status: ExampleStatus
  region: ExampleRegion
  skills: string[]
  dateRange: DateRangeValue | null
}

export interface FilterScheme {
  id: string
  name: string
  filters: SelectionFilters
}

export type RemoteOptionSource = (
  query: string,
  signal: AbortSignal,
) => Promise<readonly SelectionOption[]>

export const DEFAULT_SELECTION_FILTERS: Readonly<SelectionFilters> = {
  status: 'all',
  region: 'all',
  skills: [],
  dateRange: null,
}

export const SELECTION_FILTER_QUERY_KEYS = [
  'selectionStatus',
  'selectionRegion',
  'selectionSkills',
  'selectionStart',
  'selectionEnd',
] as const

export const SAVED_FILTER_SCHEMES_KEY = 'gvueter.component-center.selection-schemes.v1'

const statuses = new Set<ExampleStatus>(['active', 'all', 'paused'])
const regions = new Set<ExampleRegion>(['all', 'americas', 'asia', 'europe'])
const skillKeys = new Set(['accessibility', 'analytics', 'security', 'vue'])
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

function getFirstQueryValue(queryValue: LocationQuery[string] | undefined): string | undefined {
  if (Array.isArray(queryValue))
    return queryValue.find((candidate): candidate is string => typeof candidate === 'string')
  return typeof queryValue === 'string' ? queryValue : undefined
}

function isExampleStatus(status: string | undefined): status is ExampleStatus {
  return status !== undefined && statuses.has(status as ExampleStatus)
}

function isExampleRegion(region: string | undefined): region is ExampleRegion {
  return region !== undefined && regions.has(region as ExampleRegion)
}

function isIsoDate(date: string | undefined): date is string {
  if (!date || !isoDatePattern.test(date))
    return false

  const parsedDate = new Date(`${date}T00:00:00.000Z`)
  return !Number.isNaN(parsedDate.valueOf()) && parsedDate.toISOString().startsWith(date)
}

export function readSelectionFilters(query: LocationQuery): SelectionFilters {
  const requestedStatus = getFirstQueryValue(query.selectionStatus)
  const requestedRegion = getFirstQueryValue(query.selectionRegion)
  const requestedSkills
    = getFirstQueryValue(query.selectionSkills)
      ?.split(',')
      .filter(skill => skillKeys.has(skill)) ?? []
  const requestedStart = getFirstQueryValue(query.selectionStart)
  const requestedEnd = getFirstQueryValue(query.selectionEnd)

  // AI modified: URL input is allow-listed before it can become interactive filter state.
  return {
    status: isExampleStatus(requestedStatus) ? requestedStatus : 'all',
    region: isExampleRegion(requestedRegion) ? requestedRegion : 'all',
    skills: [...new Set(requestedSkills)],
    dateRange:
      isIsoDate(requestedStart) && isIsoDate(requestedEnd) && requestedStart <= requestedEnd
        ? { start: requestedStart, end: requestedEnd }
        : null,
  }
}

export function getSelectionFilterQuery(
  currentQuery: LocationQuery,
  filters: SelectionFilters,
): LocationQueryRaw {
  const nextQuery: LocationQueryRaw = { ...currentQuery }
  for (const queryKey of SELECTION_FILTER_QUERY_KEYS) delete nextQuery[queryKey]

  if (filters.status !== 'all')
    nextQuery.selectionStatus = filters.status
  if (filters.region !== 'all')
    nextQuery.selectionRegion = filters.region
  if (filters.skills.length > 0)
    nextQuery.selectionSkills = filters.skills.join(',')
  if (filters.dateRange) {
    nextQuery.selectionStart = filters.dateRange.start
    nextQuery.selectionEnd = filters.dateRange.end
  }

  return nextQuery
}

function isSelectionFilters(value: unknown): value is SelectionFilters {
  if (typeof value !== 'object' || value === null)
    return false

  const candidate = value as Partial<SelectionFilters>
  return (
    typeof candidate.status === 'string'
    && statuses.has(candidate.status as ExampleStatus)
    && typeof candidate.region === 'string'
    && regions.has(candidate.region as ExampleRegion)
    && Array.isArray(candidate.skills)
    && candidate.skills.every(skill => typeof skill === 'string' && skillKeys.has(skill))
    && (candidate.dateRange === null
      || (typeof candidate.dateRange === 'object'
        && candidate.dateRange !== null
        && isIsoDate(candidate.dateRange.start)
        && isIsoDate(candidate.dateRange.end)
        && candidate.dateRange.start <= candidate.dateRange.end))
  )
}

function isFilterScheme(value: unknown): value is FilterScheme {
  if (typeof value !== 'object' || value === null)
    return false

  const candidate = value as Partial<FilterScheme>
  return (
    typeof candidate.id === 'string'
    && candidate.id.length > 0
    && typeof candidate.name === 'string'
    && candidate.name.trim().length > 0
    && candidate.name.length <= 60
    && isSelectionFilters(candidate.filters)
  )
}

export function readSavedFilterSchemes(storageValue: string | null): FilterScheme[] {
  if (!storageValue)
    return []

  try {
    const storedValue: unknown = JSON.parse(storageValue)
    // AI modified: persisted demo filters are treated as untrusted input after every reload.
    return Array.isArray(storedValue)
      ? storedValue.filter(isFilterScheme).map(scheme => ({
          id: scheme.id,
          name: scheme.name,
          filters: {
            status: scheme.filters.status,
            region: scheme.filters.region,
            skills: [...scheme.filters.skills],
            dateRange: scheme.filters.dateRange ? { ...scheme.filters.dateRange } : null,
          },
        }))
      : []
  }
  catch {
    return []
  }
}
