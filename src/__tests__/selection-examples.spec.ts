import type {
  RemoteOptionSource,
  SelectionOption,
} from '@/features/component-gallery/selection/selection-examples'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { DateRangePicker } from '@/components/admin'
import { componentCenterModules } from '@/features/component-gallery/component-center-modules'
import AdvancedFilterExample from '@/features/component-gallery/selection/components/AdvancedFilterExample.vue'
import DependentSelectionExample from '@/features/component-gallery/selection/components/DependentSelectionExample.vue'
import MultiSelectField from '@/features/component-gallery/selection/components/MultiSelectField.vue'
import RemoteSearchExample from '@/features/component-gallery/selection/components/RemoteSearchExample.vue'
import {
  getSelectionFilterQuery,
  readSavedFilterSchemes,
  readSelectionFilters,
  SAVED_FILTER_SCHEMES_KEY,
} from '@/features/component-gallery/selection/selection-examples'
import SelectionExamplesPage from '@/features/component-gallery/selection/SelectionExamplesPage.vue'
import { i18n, setLocale } from '@/i18n'
import { generateMockToken } from '@/mocks/data/users'
import adminRoutes from '@/router/routes/admin'

enableAutoUnmount(afterEach)

function createSelectionRouter(initialPath = '/components/selection') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/components', component: { template: '<div />' } },
      ...componentCenterModules.map((componentModule) => ({
        path: componentModule.path,
        component: { template: '<div />' },
      })),
    ],
  })
  return router
    .push(initialPath)
    .then(() => router.isReady())
    .then(() => router)
}

beforeEach(() => {
  setLocale('en-US')
  localStorage.removeItem('auth_token')
  sessionStorage.setItem('auth_token', generateMockToken(1))
  localStorage.removeItem(SAVED_FILTER_SCHEMES_KEY)
})

afterEach(() => {
  localStorage.removeItem('auth_token')
  sessionStorage.removeItem('auth_token')
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('selection URL and saved-scheme contracts', () => {
  it('allow-lists query values and preserves unrelated route state', () => {
    const filters = readSelectionFilters({
      selectionStatus: 'active',
      selectionRegion: 'invalid-region',
      selectionSkills: 'vue,unknown,security,vue',
      selectionStart: '2026-07-14',
      selectionEnd: '2026-07-01',
    })

    expect(filters).toEqual({
      status: 'active',
      region: 'all',
      skills: ['vue', 'security'],
      dateRange: null,
    })
    expect(
      getSelectionFilterQuery(
        { page: '4', selectionStatus: 'paused' },
        {
          status: 'all',
          region: 'asia',
          skills: ['accessibility'],
          dateRange: { start: '2026-07-01', end: '2026-07-14' },
        },
      ),
    ).toEqual({
      page: '4',
      selectionRegion: 'asia',
      selectionSkills: 'accessibility',
      selectionStart: '2026-07-01',
      selectionEnd: '2026-07-14',
    })
  })

  it('rejects malformed persisted schemes and copies accepted nested state', () => {
    const storedSchemes = [
      {
        id: 'security-view',
        name: 'Security view',
        filters: { status: 'active', region: 'asia', skills: ['security'], dateRange: null },
      },
    ]
    const schemes = readSavedFilterSchemes(
      JSON.stringify([...storedSchemes, { id: '', name: '<script>', filters: {} }]),
    )

    expect(schemes).toEqual(storedSchemes)
    storedSchemes[0]!.filters.skills.push('vue')
    expect(schemes[0]?.filters.skills).toEqual(['security'])
    expect(readSavedFilterSchemes('{broken')).toEqual([])
  })
})

describe('selection interaction examples', () => {
  it('supports the complete keyboard and active-descendant contract for multi-select', async () => {
    const wrapper = mount(MultiSelectField, {
      attachTo: document.body,
      props: {
        options: [
          { value: 'vue', label: 'Vue' },
          { value: 'archived', label: 'Archived', disabled: true },
          { value: 'security', label: 'Security' },
        ],
        label: 'Capabilities',
        placeholder: 'Choose capabilities',
        searchPlaceholder: 'Search capabilities',
        emptyLabel: 'No capabilities',
        clearLabel: 'Clear capabilities',
        removeLabel: 'Remove capability',
      },
    })
    const trigger = wrapper.get<HTMLButtonElement>('button[aria-label="Capabilities"]')
    trigger.element.focus()
    await trigger.trigger('click')
    await flushPromises()

    const input = document.body.querySelector<HTMLInputElement>(
      'input[role="combobox"][aria-label="Capabilities"]',
    )
    const listbox = document.body.querySelector<HTMLElement>(
      '[role="listbox"][aria-label="Capabilities"]',
    )
    expect(input).not.toBeNull()
    expect(listbox).not.toBeNull()
    expect(document.activeElement).toBe(input)
    expect(input?.getAttribute('aria-controls')).toBe(listbox?.id)
    expect(listbox?.getAttribute('aria-multiselectable')).toBe('true')

    const options = [...(listbox?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])]
    const [firstOption, disabledOption, lastOption] = options
    expect(options).toHaveLength(3)
    expect(input?.getAttribute('aria-activedescendant')).toBe(firstOption?.id)

    input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await nextTick()
    expect(input?.getAttribute('aria-activedescendant')).toBe(lastOption?.id)
    expect(input?.getAttribute('aria-activedescendant')).not.toBe(disabledOption?.id)

    input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    await nextTick()
    expect(input?.getAttribute('aria-activedescendant')).toBe(firstOption?.id)

    input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    await nextTick()
    expect(input?.getAttribute('aria-activedescendant')).toBe(lastOption?.id)
    input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await nextTick()
    expect(lastOption?.getAttribute('aria-selected')).toBe('true')

    input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    await nextTick()
    expect(input?.getAttribute('aria-activedescendant')).toBe(firstOption?.id)
    input?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    await nextTick()
    expect(firstOption?.getAttribute('aria-selected')).toBe('true')
    const selectionEvents = wrapper.emitted('update:modelValue') ?? []
    expect(selectionEvents[selectionEvents.length - 1]?.[0]).toEqual(['security', 'vue'])

    input?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(trigger.attributes('aria-expanded')).toBe('false')
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger.element))
  })

  it('names the date-range trigger and guards incomplete, applies, and clears a range', async () => {
    const wrapper = mount(DateRangePicker, {
      attachTo: document.body,
      props: {
        label: 'Active date',
        presets: [{ label: 'Last week', value: { start: '2026-07-06', end: '2026-07-12' } }],
      },
      global: { plugins: [i18n] },
    })

    await wrapper.get('[aria-label="Active date"]').trigger('click')
    await nextTick()
    const calendar = document.body.querySelector<HTMLElement>('[data-slot="range-calendar"]')
    expect(calendar?.getAttribute('aria-label')).toContain('Start date')
    const calendarDays = [
      ...(calendar?.querySelectorAll<HTMLButtonElement>(
        '[data-reka-calendar-cell-trigger]:not([data-outside-visible-view]):not([data-outside-view])',
      ) ?? []),
    ]
    expect(calendarDays.length).toBeGreaterThanOrEqual(2)
    calendarDays[0]!.click()
    await nextTick()
    const applyButton = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === 'Apply',
    )
    expect(applyButton?.disabled).toBe(true)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    const preset = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === 'Last week',
    )
    preset?.click()
    await nextTick()
    expect(applyButton?.disabled).toBe(false)
    applyButton?.click()
    await nextTick()
    const appliedRangeEvents = wrapper.emitted('update:modelValue') ?? []
    expect(appliedRangeEvents[appliedRangeEvents.length - 1]?.[0]).toEqual({
      start: '2026-07-06',
      end: '2026-07-12',
    })

    await wrapper.get('[aria-label="Active date"]').trigger('click')
    await nextTick()
    const clearButton = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === 'Clear',
    )
    clearButton?.click()
    await nextTick()
    const clearedRangeEvents = wrapper.emitted('update:modelValue') ?? []
    expect(clearedRangeEvents[clearedRangeEvents.length - 1]?.[0]).toBeNull()
  })

  it('clears stale team and member values when an upstream dependency changes', async () => {
    const wrapper = mount(DependentSelectionExample, { global: { plugins: [i18n] } })
    const organization = wrapper.get<HTMLSelectElement>('#dependent-organization')
    const team = wrapper.get<HTMLSelectElement>('#dependent-team')
    const member = wrapper.get<HTMLSelectElement>('#dependent-member')

    expect(team.attributes('disabled')).toBeDefined()
    expect(member.attributes('disabled')).toBeDefined()
    await organization.setValue('commerce')
    expect(team.attributes('disabled')).toBeUndefined()
    await team.setValue('growth')
    await member.setValue('luna')
    expect(wrapper.get('[data-testid="dependent-selection-summary"]').text()).toContain(
      'member=luna',
    )

    await organization.setValue('platform')
    expect(team.element.value).toBe('')
    expect(member.element.value).toBe('')
    expect(member.attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="dependent-selection-summary"]').text()).not.toContain('luna')
  })

  it('publishes only the latest remote response and aborts its obsolete request', async () => {
    vi.useFakeTimers()
    const pendingRequests: Array<{
      query: string
      signal: AbortSignal
      resolve: (options: readonly SelectionOption[]) => void
    }> = []
    const source: RemoteOptionSource = (query, signal) =>
      new Promise((resolve) => {
        pendingRequests.push({ query, signal, resolve })
      })
    const wrapper = mount(RemoteSearchExample, {
      attachTo: document.body,
      props: { searchOptions: source },
      global: { plugins: [i18n] },
    })
    const searchInput = wrapper.get('input[type="search"]')

    await searchInput.setValue('first')
    await vi.advanceTimersByTimeAsync(250)
    expect(pendingRequests[0]?.query).toBe('first')
    expect(wrapper.get('[data-testid="remote-search-phase"]').text()).toBe('loading')
    await searchInput.setValue('second')
    expect(pendingRequests[0]?.signal.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(250)
    expect(pendingRequests[1]?.query).toBe('second')

    pendingRequests[1]!.resolve([{ value: 'new', label: 'Newest employee' }])
    await flushPromises()
    expect(wrapper.text()).toContain('Newest employee')
    pendingRequests[0]!.resolve([{ value: 'old', label: 'Obsolete employee' }])
    await flushPromises()
    expect(wrapper.text()).not.toContain('Obsolete employee')
    expect(wrapper.get('[data-testid="remote-search-phase"]').text()).toBe('ready')
  })

  it('exposes remote error, retry, empty, selection, and clear states', async () => {
    vi.useFakeTimers()
    let requestCount = 0
    const source: RemoteOptionSource = async (query) => {
      requestCount += 1
      if (query === 'failure' && requestCount === 1) throw new Error('Directory unavailable')
      if (query === 'none') return []
      return [{ value: 'recovered', label: 'Recovered employee' }]
    }
    const wrapper = mount(RemoteSearchExample, {
      attachTo: document.body,
      props: { searchOptions: source },
      global: { plugins: [i18n] },
    })
    const searchInput = wrapper.get('input[type="search"]')

    await searchInput.setValue('failure')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('temporarily unavailable')
    await wrapper.get('[role="alert"] button').trigger('click')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    expect(wrapper.text()).toContain('Recovered employee')
    await wrapper.get('[role="option"]').trigger('click')
    expect(wrapper.text()).toContain('Selected: Recovered employee')
    await wrapper.get('[aria-label="Clear remote search"]').trigger('click')
    expect(wrapper.get('[data-testid="remote-search-phase"]').text()).toBe('idle')

    await searchInput.setValue('none')
    await vi.advanceTimersByTimeAsync(250)
    await flushPromises()
    expect(wrapper.get('[data-testid="remote-search-phase"]').text()).toBe('empty')
  })

  it('restores filters from the route, syncs changes, saves a scheme, and clears owned keys', async () => {
    const router = await createSelectionRouter(
      '/components/selection?selectionStatus=active&selectionRegion=invalid&unrelated=keep',
    )
    const wrapper = mount(AdvancedFilterExample, { global: { plugins: [router, i18n] } })

    expect(wrapper.get<HTMLSelectElement>('#selection-filter-status').element.value).toBe('active')
    expect(wrapper.get<HTMLSelectElement>('#selection-filter-region').element.value).toBe('all')
    await wrapper.get('#selection-filter-region').setValue('asia')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({
      selectionStatus: 'active',
      selectionRegion: 'asia',
      unrelated: 'keep',
    })
    expect(wrapper.get('[data-testid="selection-filter-url"]').text()).toContain(
      'selectionRegion=asia',
    )

    const removeRegionButton = wrapper
      .findAll('button')
      .find((button) => button.attributes('aria-label') === 'Remove filter: Region: Asia')
    expect(removeRegionButton).toBeDefined()
    await removeRegionButton!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.selectionRegion).toBeUndefined()
    await wrapper.get('#selection-filter-region').setValue('asia')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    await wrapper.get('#selection-scheme-name').setValue('APAC active users')
    const saveButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Save current scheme')
    expect(saveButton).toBeDefined()
    await saveButton!.trigger('click')
    await flushPromises()
    expect(readSavedFilterSchemes(localStorage.getItem(SAVED_FILTER_SCHEMES_KEY))).toHaveLength(1)

    const clearButton = wrapper.findAll('button').find((button) => button.text() === 'Clear all')
    expect(clearButton).toBeDefined()
    await clearButton!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ unrelated: 'keep' })

    const applySchemeButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Apply scheme')
    expect(applySchemeButton).toBeDefined()
    await applySchemeButton!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({
      selectionStatus: 'active',
      selectionRegion: 'asia',
      unrelated: 'keep',
    })
  })

  it('keeps filter schemes usable in memory when persistent storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError')
    })
    const router = await createSelectionRouter()
    const wrapper = mount(AdvancedFilterExample, { global: { plugins: [router, i18n] } })

    await wrapper.get('#selection-scheme-name').setValue('In-memory scheme')
    const saveButton = wrapper
      .findAll('button')
      .find((button) => button.text() === 'Save current scheme')
    expect(saveButton).toBeDefined()
    await saveButton!.trigger('click')

    // AI modified: persistence failure does not discard the current-session scheme or crash the form.
    expect(wrapper.text()).toContain('In-memory scheme')
    expect(wrapper.text()).toContain('kept for this visit only')
  })
})

describe('dedicated selection route', () => {
  it('registers the dedicated page and renders bilingual, responsive, documented sections', async () => {
    const adminRoot = adminRoutes.find((route) => route.name === 'admin-root')
    const selectionRoute = adminRoot?.children?.find(
      (route) => route.name === 'component-selection',
    )
    expect(selectionRoute?.props).toBeUndefined()
    expect(selectionRoute?.meta?.cacheKey).toBe('SelectionExamplesPage')

    const router = await createSelectionRouter()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = mount(SelectionExamplesPage, {
      global: { plugins: [createPinia(), router, i18n, [VueQueryPlugin, { queryClient }]] },
    })
    await flushPromises()

    for (const sectionId of [
      'selection-identity',
      'selection-hierarchy',
      'selection-dependent',
      'selection-remote',
      'selection-filters',
    ]) {
      const section = wrapper.get(`#${sectionId}`)
      expect(section.attributes('aria-labelledby')).toBe(`${sectionId}-title`)
      expect(section.classes()).toContain('scroll-mt-24')
    }
    expect(wrapper.text()).toContain('Accessibility')
    expect(wrapper.text()).toContain('Test status')
    expect(wrapper.find('.xl\\:grid-cols-5').exists()).toBe(true)
    expect(
      wrapper.find('[role="combobox"][aria-label="DictSelect · release status"]').exists(),
    ).toBe(true)

    setLocale('zh-CN')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('nav[aria-label="筛选器与选择器示例导航"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('无障碍')
    expect(wrapper.text()).toContain('测试状态')
  })
})
