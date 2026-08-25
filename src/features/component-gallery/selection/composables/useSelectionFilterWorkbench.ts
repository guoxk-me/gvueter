import type { FilterScheme, SelectionFilters } from '../selection-examples'
import { computed, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getBrowserStorage, safeStorageGet, safeStorageSet } from '@/lib/browser-storage'
import {
  DEFAULT_SELECTION_FILTERS,
  getSelectionFilterQuery,
  readSavedFilterSchemes,
  readSelectionFilters,
  SAVED_FILTER_SCHEMES_KEY,
} from '../selection-examples'

export function useSelectionFilterWorkbench() {
  const route = useRoute()
  const router = useRouter()
  const routeFilters = readSelectionFilters(route.query)
  const draftFilters = shallowRef<SelectionFilters>({
    ...routeFilters,
    skills: [...routeFilters.skills],
    dateRange: routeFilters.dateRange ? { ...routeFilters.dateRange } : null,
  })
  const appliedFilters = shallowRef<SelectionFilters>({
    ...routeFilters,
    skills: [...routeFilters.skills],
    dateRange: routeFilters.dateRange ? { ...routeFilters.dateRange } : null,
  })
  const savedSchemes = shallowRef<FilterScheme[]>(
    readSavedFilterSchemes(safeStorageGet(getBrowserStorage('local'), SAVED_FILTER_SCHEMES_KEY)),
  )
  const schemeName = shallowRef('')

  const selectedFilterCount = computed(
    () =>
      [
        appliedFilters.value.status !== DEFAULT_SELECTION_FILTERS.status,
        appliedFilters.value.region !== DEFAULT_SELECTION_FILTERS.region,
        appliedFilters.value.skills.length > 0,
        appliedFilters.value.dateRange !== null,
      ].filter(Boolean).length,
  )

  watch(
    () => route.query,
    (query) => {
      const filters = readSelectionFilters(query)
      // AI modified: browser Back/Forward restores both visible controls and applied tag state.
      draftFilters.value = {
        ...filters,
        skills: [...filters.skills],
        dateRange: filters.dateRange ? { ...filters.dateRange } : null,
      }
      appliedFilters.value = {
        ...filters,
        skills: [...filters.skills],
        dateRange: filters.dateRange ? { ...filters.dateRange } : null,
      }
    },
  )

  function persistSavedSchemes(nextSchemes: FilterScheme[]): boolean {
    savedSchemes.value = nextSchemes
    // AI modified: saved filters remain available in memory when Web Storage is unavailable.
    return safeStorageSet(
      getBrowserStorage('local'),
      SAVED_FILTER_SCHEMES_KEY,
      JSON.stringify(nextSchemes),
    )
  }

  function setDraftFilters(filters: SelectionFilters): void {
    draftFilters.value = {
      ...filters,
      skills: [...filters.skills],
      dateRange: filters.dateRange ? { ...filters.dateRange } : null,
    }
  }

  async function applyFilters(filters = draftFilters.value): Promise<void> {
    appliedFilters.value = {
      ...filters,
      skills: [...filters.skills],
      dateRange: filters.dateRange ? { ...filters.dateRange } : null,
    }
    await router.replace({ query: getSelectionFilterQuery(route.query, appliedFilters.value) })
  }

  async function clearFilters(): Promise<void> {
    setDraftFilters({
      status: 'all',
      region: 'all',
      skills: [],
      dateRange: null,
    })
    await applyFilters(draftFilters.value)
  }

  async function applyScheme(scheme: FilterScheme): Promise<void> {
    setDraftFilters(scheme.filters)
    await applyFilters(draftFilters.value)
  }

  function saveCurrentScheme(): 'memory-only' | 'missing-name' | 'saved' {
    const requestedName = schemeName.value.trim().slice(0, 60)
    if (!requestedName)
      return 'missing-name'

    const existingScheme = savedSchemes.value.find(scheme => scheme.name === requestedName)
    const savedScheme: FilterScheme = {
      id: existingScheme?.id ?? `selection-scheme-${Date.now()}`,
      name: requestedName,
      filters: {
        ...draftFilters.value,
        skills: [...draftFilters.value.skills],
        dateRange: draftFilters.value.dateRange ? { ...draftFilters.value.dateRange } : null,
      },
    }
    const remainingSchemes = savedSchemes.value.filter(scheme => scheme.id !== savedScheme.id)
    const isPersisted = persistSavedSchemes([...remainingSchemes, savedScheme])
    schemeName.value = ''
    return isPersisted ? 'saved' : 'memory-only'
  }

  function removeScheme(schemeId: string): void {
    persistSavedSchemes(savedSchemes.value.filter(scheme => scheme.id !== schemeId))
  }

  async function removeAppliedFilter(
    filterKey: 'dateRange' | 'region' | 'skills' | 'status',
  ): Promise<void> {
    const nextFilters: SelectionFilters = {
      ...appliedFilters.value,
      skills: filterKey === 'skills' ? [] : [...appliedFilters.value.skills],
      dateRange:
        filterKey === 'dateRange'
          ? null
          : appliedFilters.value.dateRange
            ? { ...appliedFilters.value.dateRange }
            : null,
    }
    if (filterKey === 'status')
      nextFilters.status = 'all'
    if (filterKey === 'region')
      nextFilters.region = 'all'

    setDraftFilters(nextFilters)
    await applyFilters(nextFilters)
  }

  return {
    appliedFilters,
    applyFilters,
    applyScheme,
    clearFilters,
    draftFilters,
    removeAppliedFilter,
    removeScheme,
    route,
    savedSchemes,
    saveCurrentScheme,
    schemeName,
    selectedFilterCount,
    setDraftFilters,
  }
}
