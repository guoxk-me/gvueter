import type { PaginationState } from '@tanstack/vue-table'
import type { ProTableLabels } from '@/components/pro-table/types'
import { createColumnHelper } from '@tanstack/vue-table'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import SearchForm from '@/components/admin/SearchForm.vue'
import ProTable from '@/components/pro-table/ProTable.vue'
import { Select } from '@/components/ui/select'
import UserTable from '@/features/users/components/UserTable.vue'
import { maskEmail } from '@/features/users/user-privacy'
import { i18n, setLocale } from '@/i18n'

interface TestRow {
  id: number
  name: string
  email: string
  children?: TestRow[]
}

const columnHelper = createColumnHelper<TestRow>()
const columns = [
  columnHelper.accessor('name', {
    header: 'Name',
    size: 160,
    meta: { label: 'Name', editable: true, textBehavior: 'wrap', minWidth: 180 },
  }),
  columnHelper.accessor('email', {
    header: 'Email',
    size: 240,
    meta: { label: 'Email', textBehavior: 'truncate', minWidth: 240 },
  }),
]
const rows: TestRow[] = [
  { id: 1, name: 'Charlie', email: 'charlie@example.com' },
  { id: 2, name: 'Alice', email: 'alice@example.com' },
  { id: 3, name: 'Bob', email: 'bob@example.com' },
]
const labels: ProTableLabels = {
  columns: 'Columns',
  density: 'Density',
  densityCompact: 'Compact',
  densityStandard: 'Standard',
  densityComfortable: 'Comfortable',
  fullscreen: 'Fullscreen',
  exitFullscreen: 'Exit fullscreen',
  pinLeft: 'Pin left',
  pinRight: 'Pin right',
  unpin: 'Unpin',
  moveColumnUp: 'Move column up',
  moveColumnDown: 'Move column down',
  columnMoved: '{column} moved to position {position} of {total}',
  expand: 'Expand',
  collapse: 'Collapse',
  editCell: 'Double click to edit',
  rowsPerPage: 'Rows per page',
  pageOf: 'Page {current} of {total}',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  selectAll: 'Select all',
  selectRow: 'Select row',
  actions: 'Actions',
}

function mountTable(
  overrides: Record<string, unknown> = {},
  slots: Record<string, string> = {},
  shouldAttach = false,
) {
  return mount(ProTable<TestRow>, {
    ...(shouldAttach ? { attachTo: document.body } : {}),
    props: {
      columns,
      data: rows,
      labels,
      emptyMessage: 'No rows',
      getRowId: (row: TestRow) => String(row.id),
      enableColumnControls: false,
      enableDensity: false,
      enableFullscreen: false,
      ...overrides,
    },
    slots,
    global: { plugins: [i18n] },
  })
}

afterEach(() => {
  document.body.innerHTML = ''
})

async function selectPageSize(label: string, pageSize: number): Promise<void> {
  const selectTrigger = document.body.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)
  expect(selectTrigger).not.toBeNull()
  selectTrigger!.hasPointerCapture = () => false
  selectTrigger!.setPointerCapture = () => undefined
  selectTrigger!.releasePointerCapture = () => undefined
  const openEvent = new MouseEvent('pointerdown', { bubbles: true, button: 0 })
  Object.defineProperties(openEvent, {
    pointerId: { value: 1 },
    pointerType: { value: 'mouse' },
  })
  selectTrigger!.dispatchEvent(openEvent)
  await nextTick()

  const pageSizeOption = [
    ...document.body.querySelectorAll<HTMLElement>('[data-slot="select-item"]'),
  ].find(option => option.textContent?.trim() === String(pageSize))
  expect(pageSizeOption).toBeDefined()
  pageSizeOption!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
  pageSizeOption!.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
  pageSizeOption!.click()
  await nextTick()
  await nextTick()
}

describe('proTable public behavior', () => {
  it('uses localized default labels and omits an empty lightweight toolbar', () => {
    setLocale('en-US')
    const wrapper = mountTable({ labels: undefined })

    wrapper.get('button[aria-label="Next page"]')
    expect(wrapper.get('[data-testid="pro-table"]').element.firstElementChild).toBe(
      wrapper.get('[data-testid="pro-table-viewport"]').element,
    )

    wrapper.unmount()
  })

  it('shows the lightweight toolbar for each independent control and extension slot', () => {
    const densityTable = mountTable({ enableDensity: true })
    densityTable.get(`button[aria-label="${labels.density}"]`)
    densityTable.unmount()

    const fullscreenTable = mountTable({ enableFullscreen: true })
    fullscreenTable.get(`button[aria-label="${labels.fullscreen}"]`)
    fullscreenTable.unmount()

    for (const slotName of ['toolbar-leading', 'toolbar-export', 'toolbar-print']) {
      const slotTable = mountTable({}, { [slotName]: `<span>${slotName}</span>` })
      expect(slotTable.text()).toContain(slotName)
      slotTable.unmount()
    }
  })

  it('uses column text behavior and declared minima for header and cell layout', () => {
    const wrapper = mountTable()
    const nameHeader = wrapper.findAll('th').find(header => header.text().includes('Name'))
    const emailCell = wrapper.find('[data-row-id="1"] td:nth-last-child(1)')
    const firstRow = wrapper.get('[data-row-id="1"]')

    expect(nameHeader?.classes()).toContain('whitespace-normal')
    expect(nameHeader?.attributes('style')).toContain('width: 180px')
    expect(emailCell.classes()).toContain('truncate')
    // AI modified: density is a minimum so wrapped cell content can increase a non-virtual row's height.
    expect((firstRow.element as HTMLElement).style.minHeight).toBe('44px')
    expect((firstRow.element as HTMLElement).style.height).toBe('')

    wrapper.unmount()
  })

  it('sorts client rows and commits inline edits through typed events', async () => {
    const wrapper = mountTable()
    const sortableHeader = wrapper.findAll('th').find(header => header.text().includes('Name'))
    const nameHeader = wrapper.findAll('button').find(button => button.text().includes('Name'))
    expect(nameHeader).toBeDefined()
    expect(sortableHeader?.attributes('aria-sort')).toBe('none')

    await nameHeader!.trigger('click')
    expect(sortableHeader?.attributes('aria-sort')).toBe('ascending')
    expect(wrapper.findAll('[data-row-id]').map(row => row.attributes('data-row-id'))).toEqual([
      '2',
      '3',
      '1',
    ])

    const firstNameCell = wrapper.find('[data-row-id="2"] td')
    await firstNameCell.trigger('dblclick')
    const editInput = firstNameCell.find('input')
    await editInput.setValue('Alicia')
    await editInput.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('editCommit')?.[0]?.[0]).toMatchObject({
      rowId: '2',
      columnId: 'name',
      value: 'Alicia',
      previousValue: 'Alice',
    })
  })

  it('opens editable cells with Enter or F2 and restores focus after commit or cancel', async () => {
    const wrapper = mountTable({}, {}, true)
    const editableCell = wrapper.get('[data-row-id="1"] td')

    expect(editableCell.attributes('tabindex')).toBe('0')
    expect(editableCell.attributes('aria-keyshortcuts')).toBe('Enter F2')

    const editableCellElement = editableCell.element as HTMLElement
    editableCellElement.focus()
    await editableCell.trigger('keydown', { key: 'F2' })
    const cancelledInput = editableCell.get('input')
    await cancelledInput.setValue('Cancelled')
    await cancelledInput.trigger('keydown', { key: 'Escape' })
    await nextTick()

    expect(wrapper.emitted('editCommit')).toBeUndefined()
    expect(document.activeElement).toBe(editableCellElement)

    await editableCell.trigger('keydown', { key: 'Enter' })
    const committedInput = editableCell.get('input')
    await committedInput.setValue('Charles')
    await committedInput.trigger('keydown', { key: 'Enter' })
    await nextTick()

    expect(wrapper.emitted('editCommit')?.[0]?.[0]).toMatchObject({
      rowId: '1',
      columnId: 'name',
      value: 'Charles',
    })
    expect(document.activeElement).toBe(editableCellElement)

    wrapper.unmount()
  })

  it('emits controlled server pagination, sorting, and row selection state', async () => {
    const pagination: PaginationState = { pageIndex: 0, pageSize: 2 }
    const wrapper = mountTable({
      pagination,
      manualPagination: true,
      manualSorting: true,
      rowCount: 12,
      pageSizeOptions: [2, 5, 10],
      enableRowSelection: true,
      getRowLabel: (row: TestRow) => row.name,
    })

    const nextPage = wrapper.find(`button[aria-label="${labels.nextPage}"]`)
    await nextPage.trigger('click')
    expect(wrapper.emitted('paginationChange')?.[0]?.[0]).toEqual({ pageIndex: 1, pageSize: 2 })

    const nameHeader = wrapper.findAll('button').find(button => button.text().includes('Name'))
    await nameHeader!.trigger('click')
    expect(wrapper.emitted('sortingChange')?.[0]?.[0]).toEqual([{ id: 'name', desc: false }])

    const rowCheckboxes = wrapper.findAll('[data-slot="checkbox"]')
    expect(rowCheckboxes[1]!.attributes('aria-label')).toBe('Select row: Charlie')
    await rowCheckboxes[1]!.trigger('click')
    expect(wrapper.emitted('selectionChange')?.[0]?.[0]).toMatchObject({
      selectedRowIds: { 1: true },
      rows: [rows[0]],
    })
  })

  it('reacts to controlled pagination without stale page text, rows, or Select value', async () => {
    const pagedRows: TestRow[] = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      name: `Record ${index + 1}`,
      email: `record.${index + 1}@example.com`,
    }))
    const paginationRequests: PaginationState[] = []
    const wrapper = mountTable(
      {
        'data': pagedRows,
        'pagination': { pageIndex: 0, pageSize: 5 },
        'pageSizeOptions': [5, 10],
        'onUpdate:pagination': (pagination: PaginationState) => {
          paginationRequests.push(pagination)
          void wrapper.setProps({ pagination })
        },
      },
      {},
      true,
    )

    const previousPage = wrapper.get(`button[aria-label="${labels.previousPage}"]`)
    const nextPage = wrapper.get(`button[aria-label="${labels.nextPage}"]`)
    expect(wrapper.text()).toContain('Page 1 of 2')
    expect(wrapper.findAll('[data-row-id]')).toHaveLength(5)
    expect(previousPage.attributes('disabled')).toBeDefined()
    expect(nextPage.attributes('disabled')).toBeUndefined()

    await nextPage.trigger('click')
    await nextTick()
    expect(paginationRequests).toEqual([{ pageIndex: 1, pageSize: 5 }])
    expect(wrapper.text()).toContain('Page 2 of 2')
    expect(wrapper.findAll('[data-row-id]')).toHaveLength(3)
    expect(nextPage.attributes('disabled')).toBeDefined()

    await selectPageSize(labels.rowsPerPage, 10)
    expect(paginationRequests).toEqual([
      { pageIndex: 1, pageSize: 5 },
      { pageIndex: 0, pageSize: 10 },
    ])
    expect(wrapper.text()).toContain('Page 1 of 1')
    expect(wrapper.findAll('[data-row-id]')).toHaveLength(8)
    expect(wrapper.get(`[aria-label="${labels.rowsPerPage}"]`).text()).toContain('10')
    expect(previousPage.attributes('disabled')).toBeDefined()
    expect(nextPage.attributes('disabled')).toBeDefined()

    wrapper.unmount()
  })

  it('moves from a large page size to a smaller page in one controlled request', async () => {
    const pagedRows: TestRow[] = Array.from({ length: 8 }, (_, index) => ({
      id: index + 1,
      name: `Record ${index + 1}`,
      email: `record.${index + 1}@example.com`,
    }))
    const paginationRequests: PaginationState[] = []
    const wrapper = mountTable(
      {
        'data': pagedRows,
        'pagination': { pageIndex: 0, pageSize: 10 },
        'pageSizeOptions': [5, 10],
        'onUpdate:pagination': (pagination: PaginationState) => {
          paginationRequests.push(pagination)
          void wrapper.setProps({ pagination })
        },
      },
      {},
      true,
    )

    await selectPageSize(labels.rowsPerPage, 5)
    expect(paginationRequests).toEqual([{ pageIndex: 0, pageSize: 5 }])
    expect(wrapper.text()).toContain('Page 1 of 2')
    expect(wrapper.findAll('[data-row-id]')).toHaveLength(5)

    wrapper.unmount()
  })

  it('clamps controlled server pagination when the total shrinks', async () => {
    const paginationRequests: PaginationState[] = []
    const wrapper = mountTable({
      'pagination': { pageIndex: 2, pageSize: 5 },
      'pageSizeOptions': [5, 10],
      'manualPagination': true,
      'rowCount': 12,
      'onUpdate:pagination': (pagination: PaginationState) => {
        paginationRequests.push(pagination)
        void wrapper.setProps({ pagination })
      },
    })

    expect(wrapper.text()).toContain('Page 3 of 3')
    await wrapper.setProps({ rowCount: 8 })
    await nextTick()
    await nextTick()

    expect(paginationRequests).toEqual([{ pageIndex: 1, pageSize: 5 }])
    expect(wrapper.text()).toContain('Page 2 of 2')
    expect(
      wrapper.get(`button[aria-label="${labels.nextPage}"]`).attributes('disabled'),
    ).toBeDefined()
  })

  it('defers maximum page clamping until a loading server total is known', async () => {
    const paginationRequests: PaginationState[] = []
    const wrapper = mountTable({
      'pagination': { pageIndex: 1, pageSize: 5 },
      'pageSizeOptions': [5, 10],
      'manualPagination': true,
      'rowCount': 0,
      'isLoading': true,
      'onUpdate:pagination': (pagination: PaginationState) => paginationRequests.push(pagination),
    })

    expect(wrapper.text()).toContain('Page 2 of 2')
    expect(paginationRequests).toEqual([])

    await wrapper.setProps({ rowCount: 8, isLoading: false })
    await nextTick()
    expect(wrapper.text()).toContain('Page 2 of 2')
    expect(paginationRequests).toEqual([])

    await wrapper.setProps({ rowCount: 3 })
    await nextTick()
    await nextTick()
    expect(paginationRequests).toEqual([{ pageIndex: 0, pageSize: 5 }])
  })

  it('keeps a zero-total server table on the single valid empty page', () => {
    const wrapper = mountTable({
      data: [],
      pagination: { pageIndex: 0, pageSize: 5 },
      pageSizeOptions: [5, 10],
      manualPagination: true,
      rowCount: 0,
    })

    expect(wrapper.text()).toContain('Page 1 of 1')
    expect(wrapper.text()).toContain('No rows')
    expect(
      wrapper.get(`button[aria-label="${labels.previousPage}"]`).attributes('disabled'),
    ).toBeDefined()
    expect(
      wrapper.get(`button[aria-label="${labels.nextPage}"]`).attributes('disabled'),
    ).toBeDefined()
  })

  it('preserves stable-ID selection across pages and clears it for data-shaping changes', async () => {
    const pagedRows: TestRow[] = Array.from({ length: 6 }, (_, index) => ({
      id: index + 1,
      name: `Record ${index + 1}`,
      email: `record.${index + 1}@example.com`,
    }))
    const wrapper = mountTable(
      {
        'data': pagedRows,
        'pagination': { pageIndex: 0, pageSize: 2 },
        'pageSizeOptions': [2, 5],
        'enableRowSelection': true,
        'onUpdate:pagination': (pagination: PaginationState) => {
          void wrapper.setProps({ pagination })
        },
      },
      {},
      true,
    )

    await wrapper.findAll('[data-slot="checkbox"]')[1]!.trigger('click')
    const selectionEventsAfterSelection = wrapper.emitted('selectionChange') ?? []
    expect(
      selectionEventsAfterSelection[selectionEventsAfterSelection.length - 1]?.[0],
    ).toMatchObject({
      selectedRowIds: { 1: true },
    })

    await wrapper.get(`button[aria-label="${labels.nextPage}"]`).trigger('click')
    await nextTick()
    expect(wrapper.emitted('selectionChange')).toHaveLength(selectionEventsAfterSelection.length)

    const nameHeader = wrapper.findAll('button').find(button => button.text().includes('Name'))
    await nameHeader!.trigger('click')
    const selectionEventsAfterSorting = wrapper.emitted('selectionChange') ?? []
    expect(selectionEventsAfterSorting[selectionEventsAfterSorting.length - 1]?.[0]).toEqual({
      selectedRowIds: {},
      rows: [],
    })

    await wrapper.findAll('[data-slot="checkbox"]')[1]!.trigger('click')
    await selectPageSize(labels.rowsPerPage, 5)
    const selectionEventsAfterPageSize = wrapper.emitted('selectionChange') ?? []
    expect(selectionEventsAfterPageSize[selectionEventsAfterPageSize.length - 1]?.[0]).toEqual({
      selectedRowIds: {},
      rows: [],
    })

    wrapper.unmount()
  })

  it('honors visibility/order/pinning and renders import-export-print toolbar slots', () => {
    const wrapper = mountTable(
      {
        columnOrder: ['email', 'name'],
      },
      {
        'toolbar-import': '<button>Import users</button>',
        'toolbar-export': '<button>Export users</button>',
        'toolbar-print': '<button>Print users</button>',
      },
    )

    expect(wrapper.text()).toContain('Import users')
    expect(wrapper.text()).toContain('Export users')
    expect(wrapper.text()).toContain('Print users')
    expect(wrapper.findAll('th').map(header => header.text())).toEqual(['Email', 'Name'])

    const pinnedTable = mountTable({ columnPinning: { left: ['name'], right: [] } })
    expect(pinnedTable.findAll('th')[0]!.text()).toBe('Name')
    expect(pinnedTable.findAll('th')[0]!.attributes('style')).toContain('position: sticky')

    const filteredTable = mountTable({
      columnFilters: [{ id: 'name', value: 'Alice' }],
      columnVisibility: { email: false },
      density: 'compact',
    })
    expect(
      filteredTable.findAll('[data-row-id]').map(row => row.attributes('data-row-id')),
    ).toEqual(['2'])
    expect(filteredTable.text()).not.toContain('alice@example.com')
    expect(filteredTable.find('[data-row-id="2"]').attributes('style')).toContain('36px')
  })

  it('reorders columns with named keyboard controls and announces the new position', async () => {
    const wrapper = mountTable(
      {
        enableColumnControls: true,
        enableColumnOrdering: true,
        enableColumnPinning: false,
      },
      {},
      true,
    )

    if (!document.body.querySelector('[data-slot="dropdown-menu-content"][data-state="open"]')) {
      await wrapper.get<HTMLButtonElement>('[aria-label="Columns"]').trigger('keydown', {
        key: 'Enter',
      })
      await nextTick()
      await flushPromises()
    }

    const nameMoveUp = document.body.querySelector<HTMLButtonElement>(
      '[aria-label="Move column up: Name"]',
    )
    const emailMoveUp = document.body.querySelector<HTMLButtonElement>(
      '[aria-label="Move column up: Email"]',
    )
    expect(nameMoveUp?.disabled).toBe(true)
    expect(emailMoveUp?.disabled).toBe(false)

    emailMoveUp!.click()
    await nextTick()
    await nextTick()
    expect(wrapper.findAll('th').map(header => header.text())).toEqual(['Email', 'Name'])
    expect(wrapper.get('[role="status"]').text()).toBe('Email moved to position 1 of 2')

    if (!document.body.querySelector('[data-slot="dropdown-menu-content"][data-state="open"]')) {
      await wrapper.get<HTMLButtonElement>('[aria-label="Columns"]').trigger('keydown', {
        key: 'Enter',
      })
      await nextTick()
      await flushPromises()
    }
    const emailMoveDown = document.body.querySelector<HTMLButtonElement>(
      '[data-slot="dropdown-menu-content"][data-state="open"] [aria-label="Move column down: Email"]',
    )
    expect(emailMoveDown?.disabled).toBe(false)
    emailMoveDown!.click()
    await nextTick()
    await nextTick()
    expect(wrapper.findAll('th').map(header => header.text())).toEqual(['Name', 'Email'])
    expect(wrapper.get('[role="status"]').text()).toBe('Email moved to position 2 of 2')

    if (!document.body.querySelector('[data-slot="dropdown-menu-content"][data-state="open"]')) {
      await wrapper.get<HTMLButtonElement>('[aria-label="Columns"]').trigger('keydown', {
        key: 'Enter',
      })
      await nextTick()
      await flushPromises()
    }
    const columnRows = [
      ...document.body.querySelectorAll<HTMLElement>(
        '[data-slot="dropdown-menu-content"][data-state="open"] [draggable="true"]',
      ),
    ]
    const nameColumnRow = columnRows.find(columnRow => columnRow.textContent?.includes('Name'))
    const emailColumnRow = columnRows.find(columnRow => columnRow.textContent?.includes('Email'))
    expect(nameColumnRow).toBeDefined()
    expect(emailColumnRow).toBeDefined()

    nameColumnRow!.dispatchEvent(new Event('dragstart', { bubbles: true }))
    emailColumnRow!.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }))
    await nextTick()
    await nextTick()
    expect(wrapper.findAll('th').map(header => header.text())).toEqual(['Email', 'Name'])
    expect(wrapper.get('[role="status"]').text()).toBe('Name moved to position 2 of 2')

    wrapper.unmount()
  })

  it('renders loading and empty states without leaking stale rows', () => {
    const loadingTable = mountTable({ isLoading: true })
    expect(loadingTable.findAll('[data-slot="skeleton"]')).toHaveLength(20)
    expect(loadingTable.text()).not.toContain('Charlie')

    const emptyTable = mountTable({ data: [] })
    expect(emptyTable.text()).toContain('No rows')
    expect(emptyTable.findAll('[data-row-id]')).toHaveLength(0)
  })

  it('combines virtualized tree details with page-level row selection', async () => {
    const treeRows: TestRow[] = [
      {
        id: 10,
        name: 'Parent',
        email: 'parent@example.com',
        children: [{ id: 11, name: 'Child', email: 'child@example.com' }],
      },
      { id: 12, name: 'Sibling', email: 'sibling@example.com' },
    ]
    const wrapper = mountTable(
      {
        data: treeRows,
        enableExpanding: true,
        enableRowSelection: true,
        enableVirtualization: true,
        selectedRowIds: { 12: true },
        virtualHeight: 180,
        getSubRows: (row: TestRow) => row.children,
      },
      {
        'expanded-row': '<span data-testid="expanded-detail">Parent details</span>',
      },
    )

    expect(wrapper.find('[data-testid="pro-table-viewport"]').attributes('style')).toContain(
      '180px',
    )

    let checkboxElements = wrapper.findAll('[data-slot="checkbox"]')
    expect(checkboxElements[0]!.attributes('data-state')).toBe('indeterminate')

    await wrapper.setProps({ selectedRowIds: { 10: true, 11: true, 12: true } })
    await nextTick()
    checkboxElements = wrapper.findAll('[data-slot="checkbox"]')
    expect(checkboxElements[0]!.attributes('data-state')).toBe('checked')

    await wrapper.find(`button[aria-label="${labels.expand}"]`).trigger('click')
    await nextTick()

    expect(wrapper.find('[data-row-id="10"]').exists()).toBe(true)
    expect(wrapper.find('[data-row-id="11"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="expanded-detail"]').text()).toBe('Parent details')
  })
})

describe('searchForm public behavior', () => {
  it('emits immutable search snapshots and restores defaults', async () => {
    const wrapper = mount(SearchForm<{ keyword: string }>, {
      props: {
        modelValue: { keyword: '' },
        fields: [{ name: 'keyword', type: 'search', label: 'Keyword' }],
        defaultValues: { keyword: '' },
        searchLabel: 'Search',
        resetLabel: 'Reset',
      },
      slots: { summary: '<span>24 matching records</span>' },
    })

    expect(wrapper.text()).toContain('24 matching records')
    await wrapper.find('input').setValue('alice')
    await wrapper.find('form').trigger('submit')
    const searchSnapshot = wrapper.emitted('search')?.[0]?.[0]
    expect(searchSnapshot).toEqual({ keyword: 'alice' })
    expect(searchSnapshot).not.toBe(wrapper.emitted('update:modelValue')?.[0]?.[0])

    await wrapper
      .findAll('button')
      .find(button => button.text() === 'Reset')!
      .trigger('click')
    const resetSnapshot = wrapper.emitted('reset')?.[0]?.[0]
    const modelUpdates = wrapper.emitted('update:modelValue') ?? []
    expect(resetSnapshot).toEqual({ keyword: '' })
    expect(resetSnapshot).not.toBe(modelUpdates[modelUpdates.length - 1]?.[0])
  })

  it('supports typed number and select values while ignoring unsupported select payloads', async () => {
    // AI modified: cover the reusable field contract instead of relying on individual management pages.
    const wrapper = mount(
      SearchForm<{
        count: number | undefined
        emptyCategory: string | undefined
        optionalText: string | undefined
        status: string
      }>,
      {
        props: {
          modelValue: {
            count: 2,
            emptyCategory: undefined,
            optionalText: undefined,
            status: 'all',
          },
          fields: [
            { name: 'count', type: 'number', label: 'Count' },
            {
              name: 'status',
              type: 'select',
              label: 'Status',
              options: [{ label: 'Active', value: 'active' }],
            },
            { name: 'emptyCategory', type: 'select', label: 'Empty category' },
            { name: 'optionalText', type: 'text', label: 'Optional text' },
          ],
          defaultValues: {
            count: undefined,
            emptyCategory: '',
            optionalText: undefined,
            status: 'all',
          },
          searchLabel: 'Search',
          resetLabel: 'Reset',
        },
      },
    )

    const inputs = wrapper.findAll('input')
    const lastModelValue = (): unknown => {
      const updates = wrapper.emitted('update:modelValue') ?? []
      return updates[updates.length - 1]?.[0]
    }
    expect(inputs[0]?.element.value).toBe('2')
    expect(inputs[1]?.element.value).toBe('')

    await inputs[0]!.setValue('7')
    expect(lastModelValue()).toMatchObject({ count: 7 })
    await inputs[0]!.setValue('')
    expect(lastModelValue()).toMatchObject({ count: undefined })
    await inputs[1]!.setValue('notes')
    expect(lastModelValue()).toMatchObject({
      optionalText: 'notes',
    })

    const statusSelect = wrapper.findAllComponents(Select)[0]!
    statusSelect.vm.$emit('update:modelValue', 'active')
    await nextTick()
    expect(lastModelValue()).toMatchObject({ status: 'active' })

    statusSelect.vm.$emit('update:modelValue', 2)
    await nextTick()
    expect(lastModelValue()).toMatchObject({ status: '2' })

    statusSelect.vm.$emit('update:modelValue', 3n)
    await nextTick()
    expect(lastModelValue()).toMatchObject({ status: '3' })

    const updateCount = wrapper.emitted('update:modelValue')?.length
    statusSelect.vm.$emit('update:modelValue', true)
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toHaveLength(updateCount ?? 0)
  })

  it('disables both actions while searching and keeps custom actions separate from submit', async () => {
    const wrapper = mount(SearchForm<{ keyword: string }>, {
      props: {
        modelValue: { keyword: '' },
        fields: [{ name: 'keyword', type: 'search', label: 'Keyword' }],
        defaultValues: { keyword: '' },
        searchLabel: 'Search',
        resetLabel: 'Reset',
        isSearching: true,
      },
      slots: {
        actions: '<button type="button" data-testid="extra-action">Export</button>',
      },
    })

    const actionButtons = wrapper
      .findAll('button')
      .filter(button => button.text() === 'Reset' || button.text() === 'Search')
    expect(actionButtons).toHaveLength(2)
    expect(actionButtons.every(button => button.attributes('disabled') !== undefined)).toBe(true)

    await wrapper.get('[data-testid="extra-action"]').trigger('click')
    expect(wrapper.emitted('search')).toBeUndefined()
  })
})

describe('user privacy projection', () => {
  it('masks both mailbox and domain while retaining recognition hints', () => {
    expect(maskEmail('alice@example.com')).toBe('a***@e***.com')
    expect(maskEmail('invalid-email')).toBe('***')
  })

  it('renders masked email without copy for read-only access and full email with copy for managers', async () => {
    setLocale('en-US')
    const user = {
      id: 20,
      name: 'Avery Chen',
      email: 'avery@example.com',
      role: 'viewer' as const,
      status: 'active' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    const baseProps = {
      users: [user],
      total: 1,
      isLoading: false,
      canDelete: false,
      canImport: false,
      pagination: { pageIndex: 0, pageSize: 5 },
      sorting: [],
      selectedRowIds: {},
    }

    const readOnlyTable = mount(UserTable, {
      props: { ...baseProps, canManage: false },
      global: { plugins: [i18n] },
    })
    expect(readOnlyTable.text()).toContain('a***@e***.com')
    expect(readOnlyTable.text()).not.toContain(user.email)
    expect(readOnlyTable.find('[data-masked="true"]').exists()).toBe(true)
    expect(
      readOnlyTable.findAll('button').some(button => button.text().includes('Copy email')),
    ).toBe(false)

    const managerTable = mount(UserTable, {
      props: { ...baseProps, canManage: true, canImport: true },
      global: { plugins: [i18n] },
    })
    expect(managerTable.text()).toContain(user.email)
    expect(managerTable.find('[data-masked="false"]').exists()).toBe(true)
    expect(
      managerTable.findAll('button').some(button => button.text().includes('Copy email')),
    ).toBe(true)
    await managerTable
      .findAll('button')
      .find(button => button.text().includes('Import CSV'))!
      .trigger('click')
    expect(managerTable.emitted('import')).toHaveLength(1)
    await managerTable
      .findAll('button')
      .find(button => button.text().includes('Refresh'))!
      .trigger('click')
    expect(managerTable.emitted('refresh')).toHaveLength(1)
  })
})
