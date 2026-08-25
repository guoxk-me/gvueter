import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import ClientPaginationDemo from '@/features/component-gallery/table/examples/ClientPaginationDemo.vue'
import ComplexColumnsTableDemo from '@/features/component-gallery/table/examples/ComplexColumnsTableDemo.vue'
import EditableTableDemo from '@/features/component-gallery/table/examples/EditableTableDemo.vue'
import ResponsiveTableDemo from '@/features/component-gallery/table/examples/ResponsiveTableDemo.vue'
import SelectionBulkTableDemo from '@/features/component-gallery/table/examples/SelectionBulkTableDemo.vue'
import ServerPaginationDemo from '@/features/component-gallery/table/examples/ServerPaginationDemo.vue'
import TableStatesDemo from '@/features/component-gallery/table/examples/TableStatesDemo.vue'
import TreeTableDemo from '@/features/component-gallery/table/examples/TreeTableDemo.vue'
import VirtualTableDemo from '@/features/component-gallery/table/examples/VirtualTableDemo.vue'
import {
  TABLE_EXAMPLE_SCENARIOS,
  TABLE_EXAMPLES_COPY,
  TABLE_WORK_ORDERS,
} from '@/features/component-gallery/table/table-examples'
import { i18n, setLocale } from '@/i18n'

const copy = TABLE_EXAMPLES_COPY['en-US']

enableAutoUnmount(afterEach)

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  localStorage.clear()
})

async function getTableExampleRouter(query = '') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/components/table', component: { template: '<div />' } }],
  })
  await router.push(`/components/table${query}`)
  await router.isReady()
  return router
}

describe('table example catalog', () => {
  it('documents every required scenario with support, tests, accessibility, and limitations', () => {
    expect(TABLE_EXAMPLE_SCENARIOS.map(scenario => scenario.id)).toEqual([
      'basic',
      'client-pagination',
      'server-pagination',
      'tree',
      'editable',
      'selection-bulk',
      'virtual-scroll',
      'complex-columns',
      'responsive',
      'states',
    ])
    expect(new Set(TABLE_EXAMPLE_SCENARIOS.map(scenario => scenario.id)).size).toBe(10)
    for (const scenario of TABLE_EXAMPLE_SCENARIOS) {
      expect(scenario.sharedComponent).toBeTruthy()
      expect(scenario.behavior).toBeTruthy()
      expect(scenario.testStatus).toBe('covered')
      expect(scenario.accessibility).toBeTruthy()
      expect(scenario.limitation).toBeTruthy()
      expect(copy.scenarios[scenario.id].title).toBeTruthy()
    }
  })
})

describe('table example behavior', () => {
  it('keeps client page text, rows, controls, and controlled state in sync', async () => {
    setLocale('en-US')
    const wrapper = mount(ClientPaginationDemo, {
      attachTo: document.body,
      props: { copy },
      global: { plugins: [i18n] },
    })
    const card = wrapper.get('[data-example-id="client-pagination"]')
    const previousPage = card.get('[aria-label="Previous page"]')
    const nextPage = card.get('[aria-label="Next page"]')

    expect(card.text()).toContain('Page 1 of 3')
    expect(card.findAll('tbody tr')).toHaveLength(5)
    expect(previousPage.attributes('disabled')).toBeDefined()
    expect(nextPage.attributes('disabled')).toBeUndefined()
    expect(card.get('[data-testid="client-pagination-state"]').text()).toContain('pageIndex=0')

    await nextPage.trigger('click')

    expect(card.text()).toContain('Page 2 of 3')
    expect(card.findAll('tbody tr')).toHaveLength(5)
    expect(previousPage.attributes('disabled')).toBeUndefined()
    expect(nextPage.attributes('disabled')).toBeUndefined()
    expect(card.get('[data-testid="client-pagination-state"]').text()).toContain('pageIndex=1')
  })

  it('renders only the requested server page and exposes its request parameters', async () => {
    vi.useFakeTimers()
    const router = await getTableExampleRouter()
    const wrapper = mount(ServerPaginationDemo, {
      attachTo: document.body,
      props: { copy },
      global: { plugins: [i18n, router] },
    })
    const card = wrapper.get('[data-example-id="server-pagination"]')

    expect(card.get('[data-testid="server-request"]').text()).toContain('pageIndex=0&pageSize=5')
    await vi.advanceTimersByTimeAsync(180)
    await flushPromises()
    expect(card.findAll('[data-row-id]')).toHaveLength(5)
    expect(card.get('[data-row-id="WO-0001"]').attributes('data-row-id')).toBe('WO-0001')

    await card.get('[aria-label="Next page"]').trigger('click')
    expect(card.get('[data-testid="server-request"]').text()).toContain('pageIndex=1&pageSize=5')
    await vi.advanceTimersByTimeAsync(180)
    await flushPromises()

    expect(card.text()).toContain('Page 2 of 10')
    expect(card.findAll('[data-row-id]')).toHaveLength(5)
    expect(card.get('[data-row-id="WO-0006"]').attributes('data-row-id')).toBe('WO-0006')
    expect(card.get('[aria-label="Previous page"]').attributes('disabled')).toBeUndefined()
  })

  it('restores server state from URL and cancels stale filtered requests', async () => {
    vi.useFakeTimers()
    const router = await getTableExampleRouter('?page=2&pageSize=5&sortBy=owner&sortOrder=desc')
    const wrapper = mount(ServerPaginationDemo, {
      attachTo: document.body,
      props: { copy },
      global: { plugins: [i18n, router] },
    })
    const card = wrapper.get('[data-example-id="server-pagination"]')

    expect(card.get('[data-testid="server-request"]').text()).toContain('pageIndex=1&pageSize=5')
    expect(card.get('[data-testid="server-request"]').text()).toContain(
      'sortBy=owner&sortOrder=desc',
    )

    await card.get('[data-testid="server-keyword"]').setValue('Operational')
    await card.get('[data-testid="server-keyword"]').setValue('Operational review 4')
    await flushPromises()
    expect(card.get('[data-testid="server-canceled"]').text()).toContain('2')

    await vi.advanceTimersByTimeAsync(180)
    await flushPromises()
    expect(card.get('[data-testid="server-latest-response"]').text()).toContain('#3')
    expect(card.findAll('[data-row-id]')).toHaveLength(5)
    expect(router.currentRoute.value.query).toMatchObject({
      keyword: 'Operational review 4',
      sortBy: 'owner',
      sortOrder: 'desc',
    })
  })

  it('expands and collapses native child rows', async () => {
    const wrapper = mount(TreeTableDemo, {
      props: { copy },
      global: { plugins: [i18n] },
    })
    const card = wrapper.get('[data-example-id="tree"]')

    expect(card.find('[data-row-id="program-finance-ledger"]').exists()).toBe(true)
    expect(card.find('[data-row-id="program-finance-ledger-audit"]').exists()).toBe(true)
    await card
      .get('[data-row-id="program-finance"]')
      .get('[aria-label="Collapse row"]')
      .trigger('click')
    expect(card.find('[data-row-id="program-finance-ledger"]').exists()).toBe(false)
    await card
      .get('[data-row-id="program-finance"]')
      .get('[aria-label="Expand row"]')
      .trigger('click')
    expect(card.find('[data-row-id="program-finance-ledger"]').exists()).toBe(true)
  })

  it('retries an asynchronously loaded tree branch after a deterministic failure', async () => {
    vi.useFakeTimers()
    const wrapper = mount(TreeTableDemo, {
      props: { copy },
      global: { plugins: [i18n] },
    })
    const card = wrapper.get('[data-example-id="tree"]')

    await card
      .get('[data-row-id="program-identity"]')
      .get('[aria-label="Expand row"]')
      .trigger('click')
    expect(card.get('[data-testid="tree-load-state"]').text()).toBe(copy.tree.loading)
    await vi.advanceTimersByTimeAsync(140)
    expect(card.get('[data-testid="tree-load-state"]').text()).toBe(copy.tree.failed)

    await card.get('[data-testid="tree-retry"]').trigger('click')
    await vi.advanceTimersByTimeAsync(140)
    expect(card.get('[data-testid="tree-load-state"]').text()).toBe(copy.tree.loaded)
    expect(card.find('[data-row-id="program-identity-access"]').exists()).toBe(true)
  })

  it('applies typed edit commits through the owning demo state', async () => {
    vi.useFakeTimers()
    const wrapper = mount(EditableTableDemo, {
      props: { copy },
      global: { plugins: [i18n] },
    })
    const card = wrapper.get('[data-example-id="editable"]')
    const titleCell = card.get('[data-row-id="WO-0001"]').findAll('td')[1]
    expect(titleCell).toBeDefined()

    await titleCell!.trigger('dblclick')
    const editor = titleCell!.get('input')
    await editor.setValue('Reviewed operational order')
    await editor.trigger('keydown', { key: 'Enter' })

    expect(card.get('[data-testid="last-edit"]').text()).toContain(
      'WO-0001.title = Reviewed operational order',
    )
    expect(titleCell!.text()).toContain('Reviewed operational order')
    await vi.advanceTimersByTimeAsync(160)
    expect(card.get('[data-testid="edit-save-state"]').text()).toContain(copy.editing.saved)
  })

  it('validates row edits, rolls back failed saves, and clears editing state on refresh', async () => {
    vi.useFakeTimers()
    const wrapper = mount(EditableTableDemo, {
      props: { copy },
      global: { plugins: [i18n] },
    })
    const card = wrapper.get('[data-example-id="editable"]')
    const originalTitle = TABLE_WORK_ORDERS[0]!.title

    await card.get('[data-testid="begin-row-edit"]').trigger('click')
    await card.get('[data-testid="row-edit-title"]').setValue('x')
    await card.get('[data-testid="row-editor"]').trigger('submit')
    expect(card.text()).toContain(copy.editing.titleRequired)

    await card.get('[data-testid="row-edit-title"]').setValue('Review [fail] transaction')
    await card.get('[data-testid="row-editor"]').trigger('submit')
    expect(card.get('[data-row-id="WO-0001"]').text()).toContain('Review [fail] transaction')
    await vi.advanceTimersByTimeAsync(160)
    expect(card.get('[data-testid="edit-save-state"]').text()).toContain(
      copy.editing.failedRollback,
    )
    expect(card.get('[data-row-id="WO-0001"]').text()).toContain(originalTitle)

    const titleCell = card.get('[data-row-id="WO-0001"]').findAll('td')[1]!
    await titleCell.trigger('dblclick')
    expect(titleCell.find('input').exists()).toBe(true)
    await card.get('[data-testid="refresh-editable"]').trigger('click')
    expect(card.find('[data-row-id="WO-0001"] input').exists()).toBe(false)
  })

  it('feeds stable selected IDs into bulk actions and explicit clearing', async () => {
    const wrapper = mount(SelectionBulkTableDemo, {
      props: { copy },
      global: { plugins: [i18n] },
    })
    const card = wrapper.get('[data-example-id="selection-bulk"]')
    const checkboxes = card.findAll('[data-slot="checkbox"]')

    await checkboxes[1]!.trigger('click')
    expect(card.text()).toContain('1 selected')
    await card.get('[data-testid="bulk-archive"]').trigger('click')
    expect(card.get('[data-testid="last-bulk-action"]').text()).toContain('Archive: WO-0001')

    const clearButton = card
      .findAll('button')
      .find(button => button.text().includes('Clear selection'))
    expect(clearButton).toBeDefined()
    await clearButton!.trigger('click')
    expect(card.find('[data-testid="bulk-archive"]').exists()).toBe(false)
  })

  it('preserves cross-page selection, exports scopes, and clamps after deleting the final page', async () => {
    const downloadClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    const wrapper = mount(SelectionBulkTableDemo, {
      attachTo: document.body,
      props: { copy },
      global: { plugins: [i18n] },
    })
    const card = wrapper.get('[data-example-id="selection-bulk"]')

    await card.get('[aria-label="Select all rows on this page"]').trigger('click')
    expect(card.text()).toContain('4 selected')
    const clearCurrentPage = card
      .findAll('button')
      .find(button => button.text().includes(copy.actions.clear))
    expect(clearCurrentPage).toBeDefined()
    await clearCurrentPage!.trigger('click')

    await card.get('[data-testid="export-current"]').trigger('click')
    expect(card.get('[data-testid="last-bulk-action"]').text()).toContain(
      `${copy.selection.exportCurrentPage}: 5`,
    )
    await card.get('[data-testid="export-filtered"]').trigger('click')
    expect(card.get('[data-testid="last-bulk-action"]').text()).toContain(
      `${copy.selection.exportAll}: 11`,
    )

    const firstPageRow = card.findAll('tbody tr').find(row => row.text().includes('WO-0001'))
    expect(firstPageRow).toBeDefined()
    await firstPageRow!.get('[data-slot="checkbox"]').trigger('click')
    await card.get('[aria-label="Next page"]').trigger('click')
    const secondPageRow = card.findAll('tbody tr').find(row => row.text().includes('WO-0007'))
    expect(secondPageRow).toBeDefined()
    await secondPageRow!.get('[data-slot="checkbox"]').trigger('click')
    expect(card.text()).toContain('2 selected')
    await card.get('[data-testid="export-selected"]').trigger('click')
    expect(downloadClick).toHaveBeenCalledTimes(3)
    expect(card.get('[data-testid="last-bulk-action"]').text()).toContain(
      `${copy.selection.exportSelected}: 2`,
    )

    const clearButton = card
      .findAll('button')
      .find(button => button.text().includes(copy.actions.clear))
    expect(clearButton).toBeDefined()
    await clearButton!.trigger('click')
    await card.get('[aria-label="Next page"]').trigger('click')
    expect(card.get('[data-testid="selection-page-state"]').text()).toContain('pageIndex=2')
    const finalPageRow = card.findAll('tbody tr').find(row => row.text().includes('WO-0011'))
    expect(finalPageRow).toBeDefined()
    await finalPageRow!.get('[data-slot="checkbox"]').trigger('click')
    await card.get('[data-testid="bulk-delete"]').trigger('click')
    await flushPromises()

    expect(card.get('[data-testid="selection-page-state"]').text()).toContain('pageIndex=1')
    expect(card.get('[data-testid="selection-page-state"]').text()).toContain('rows=10')
    expect(card.findAll('tbody tr').some(row => row.text().includes('WO-0011'))).toBe(false)
    expect(card.get('[aria-label="Next page"]').attributes('disabled')).toBeDefined()

    const refreshedPageRow = card.findAll('tbody tr').find(row => row.text().includes('WO-0006'))
    expect(refreshedPageRow).toBeDefined()
    await refreshedPageRow!.get('[data-slot="checkbox"]').trigger('click')
    await card.get('[data-testid="refresh-selection"]').trigger('click')
    expect(card.find('[data-testid="bulk-delete"]').exists()).toBe(false)
    expect(card.get('[data-testid="selection-page-state"]').text()).toContain('pageIndex=0')
  })

  it('bounds virtual DOM rows and exposes the complex and responsive controls', async () => {
    const virtualWrapper = mount(VirtualTableDemo, {
      props: { copy },
      global: { plugins: [i18n] },
    })
    const virtualCard = virtualWrapper.get('[data-example-id="virtual-scroll"]')
    await nextTick()
    expect(virtualCard.get('[data-testid="virtual-row-count"]').text()).toContain(
      '1,000 source rows',
    )
    expect(virtualCard.findAll('[data-row-id]').length).toBeGreaterThan(0)
    expect(virtualCard.findAll('[data-row-id]').length).toBeLessThan(50)

    const complexWrapper = mount(ComplexColumnsTableDemo, {
      props: { copy },
      global: { plugins: [i18n] },
    })
    expect(complexWrapper.get('[aria-label="Columns"]').attributes('aria-label')).toBe('Columns')
    expect(complexWrapper.get('[aria-label="Density"]').attributes('aria-label')).toBe('Density')

    const responsiveWrapper = mount(ResponsiveTableDemo, {
      props: { copy },
      global: { plugins: [i18n] },
    })
    const frame = responsiveWrapper.get('[data-testid="responsive-table-frame"]')
    expect(frame.classes()).toContain('overflow-hidden')
    expect(frame.get('[data-slot="table-container"]').classes()).toContain('overflow-auto')
  })

  it('restores allowlisted column preferences and persists a full default reset', async () => {
    localStorage.setItem(
      'gvueter:gallery:table-columns:v1',
      JSON.stringify({
        version: 1,
        density: 'comfortable',
        visibility: { region: false },
        order: ['title', 'id', 'owner', 'status', 'priority', 'region', 'amount', 'updatedAt'],
        pinning: { left: ['title'], right: ['status'] },
      }),
    )
    const wrapper = mount(ComplexColumnsTableDemo, {
      props: { copy },
      global: { plugins: [i18n] },
    })

    expect(wrapper.get('[data-testid="column-preferences"]').text()).toContain(
      '"density":"comfortable"',
    )
    expect(wrapper.get('[data-testid="column-preferences"]').text()).toContain('"region":false')
    await wrapper.get('[data-testid="reset-columns"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="column-preferences"]').text()).toContain(
      '"density":"compact"',
    )
    expect(wrapper.get('[data-testid="column-preferences"]').text()).toContain('"left":["id"]')
    expect(
      JSON.parse(localStorage.getItem('gvueter:gallery:table-columns:v1') ?? '{}'),
    ).toMatchObject({
      version: 1,
      density: 'compact',
      visibility: {},
      order: [],
      pinning: { left: ['id'], right: [] },
    })
  })

  it('keeps complex-column controls usable when preference storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError')
    })

    const wrapper = mount(ComplexColumnsTableDemo, {
      props: { copy },
      global: { plugins: [i18n] },
    })
    await wrapper.get('[data-testid="reset-columns"]').trigger('click')
    await nextTick()

    // AI modified: a blocked preference backend cannot disable the live table configuration.
    expect(wrapper.get('[data-testid="column-preferences"]').text()).toContain(
      '"density":"compact"',
    )
    expect(wrapper.find('[aria-label="Columns"]').exists()).toBe(true)
  })

  it('switches table lifecycle states and recovers from an error', async () => {
    const wrapper = mount(TableStatesDemo, {
      props: { copy },
      global: { plugins: [i18n] },
    })
    const card = wrapper.get('[data-example-id="states"]')

    await card.get('[data-testid="table-state-empty"]').trigger('click')
    expect(card.text()).toContain(copy.messages.emptyDescription)
    await card.get('[data-testid="table-state-error"]').trigger('click')
    expect(card.text()).toContain(copy.messages.errorTitle)

    const retryButton = card
      .findAll('button')
      .find(button => button.text().includes(copy.actions.retry))
    expect(retryButton).toBeDefined()
    await retryButton!.trigger('click')
    expect(card.get('[data-testid="active-table-state"]').text()).toContain('ready')
    expect(card.findAll('tbody tr')).toHaveLength(4)
  })
})
