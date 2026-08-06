import type { PaginationState } from '@tanstack/vue-table'
import type { DataTableColumnDef } from '@/components/data-table/types'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { nextTick } from 'vue'
import DataTable from '@/components/data-table/DataTable.vue'
import {
  getAcceptedPageSize,
  getAllowedPageSizes,
} from '@/components/data-table/pagination-contract'
import { i18n, setLocale } from '@/i18n'

interface TestRecord {
  id: number
  name: string
}

const columns = [{ accessorKey: 'name', header: 'Name' }]
const records: TestRecord[] = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  name: `Record ${index + 1}`,
}))

afterEach(() => {
  document.body.innerHTML = ''
})

function mountDataTable(overrides: Record<string, unknown> = {}) {
  setLocale('en-US')
  return mount(DataTable<TestRecord>, {
    attachTo: document.body,
    props: {
      columns,
      data: records,
      emptyMessage: 'No records',
      defaultPageSize: 5,
      pageSizeOptions: [5, 10],
      getRowId: (record: TestRecord) => String(record.id),
      ...overrides,
    },
    global: { plugins: [i18n] },
  })
}

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
  ].find((option) => option.textContent?.trim() === String(pageSize))
  expect(pageSizeOption).toBeDefined()
  pageSizeOption!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
  pageSizeOption!.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
  pageSizeOption!.click()
  await nextTick()
  await nextTick()
}

function visibleRows(): NodeListOf<HTMLTableRowElement> {
  return document.body.querySelectorAll('tbody tr')
}

describe('DataTable pagination contract', () => {
  it('exposes sort direction and stable row names to assistive technology', async () => {
    const wrapper = mountDataTable({
      enableRowSelection: true,
      getRowLabel: (record: TestRecord) => record.name,
    })
    const sortableHeader = wrapper.get('th[aria-sort]')

    expect(sortableHeader.attributes('aria-sort')).toBe('none')
    expect(wrapper.get('[aria-label="Select row: Record 1"]').attributes('aria-label')).toBe(
      'Select row: Record 1',
    )
    await sortableHeader.get('button').trigger('click')
    expect(sortableHeader.attributes('aria-sort')).toBe('ascending')
    await sortableHeader.get('button').trigger('click')
    expect(sortableHeader.attributes('aria-sort')).toBe('descending')

    wrapper.unmount()
  })

  it('applies declarative wrap, truncate, and minimum-width column behavior', () => {
    const longTextColumns: DataTableColumnDef<TestRecord>[] = [
      {
        accessorKey: 'name',
        header: 'Very long record name',
        meta: { textBehavior: 'truncate', minWidth: 240 },
      },
    ]
    const wrapper = mountDataTable({ columns: longTextColumns })

    expect(wrapper.get('th').classes()).toContain('truncate')
    expect(wrapper.get('th').attributes('style')).toContain('min-width: 240px')
    expect(wrapper.get('tbody td').classes()).toContain('truncate')
    expect(wrapper.get('tbody td').attributes('style')).toContain('min-width: 240px')

    wrapper.unmount()
  })

  it('keeps page text, rows, Select value, and button states in one reactive snapshot', async () => {
    const wrapper = mountDataTable()
    const previousPage = wrapper.get('[aria-label="Previous page"]')
    const nextPage = wrapper.get('[aria-label="Next page"]')

    expect(wrapper.text()).toContain('Page 1 of 2')
    expect(visibleRows()).toHaveLength(5)
    expect(previousPage.attributes('disabled')).toBeDefined()
    expect(nextPage.attributes('disabled')).toBeUndefined()

    await nextPage.trigger('click')
    expect(wrapper.text()).toContain('Page 2 of 2')
    expect(visibleRows()).toHaveLength(3)
    expect(previousPage.attributes('disabled')).toBeUndefined()
    expect(nextPage.attributes('disabled')).toBeDefined()

    await selectPageSize('Rows per page', 10)
    expect(wrapper.text()).toContain('Page 1 of 1')
    expect(visibleRows()).toHaveLength(8)
    expect(wrapper.get('[aria-label="Rows per page"]').text()).toContain('10')
    expect(wrapper.get('[aria-label="Previous page"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[aria-label="Next page"]').attributes('disabled')).toBeDefined()
    const paginationEvents = wrapper.emitted('paginationChange') ?? []
    expect(paginationEvents[paginationEvents.length - 1]?.[0]).toEqual({
      pageIndex: 0,
      pageSize: 10,
    })

    wrapper.unmount()
  })

  it('clamps a deleted last page and clears selection when the dataset changes', async () => {
    const wrapper = mountDataTable({ enableRowSelection: true })
    const rowCheckboxes = wrapper.findAll('[data-slot="checkbox"]')
    await rowCheckboxes[1]!.trigger('click')
    await wrapper.get('[aria-label="Next page"]').trigger('click')

    expect(wrapper.text()).toContain('Page 2 of 2')
    await wrapper.setProps({ data: records.slice(0, 3) })
    await nextTick()

    expect(wrapper.text()).toContain('Page 1 of 1')
    expect(visibleRows()).toHaveLength(3)
    const selectionEvents = wrapper.emitted('selectionChange') ?? []
    const paginationEvents = wrapper.emitted('paginationChange') ?? []
    expect(selectionEvents[selectionEvents.length - 1]?.[0]).toEqual({})
    expect(paginationEvents[paginationEvents.length - 1]?.[0]).toEqual({
      pageIndex: 0,
      pageSize: 5,
    })

    wrapper.unmount()
  })

  it('renders a same-page API replacement when pagination state stays unchanged', async () => {
    const wrapper = mountDataTable({ defaultPageSize: 10 })
    const refreshedRecords = [
      ...records,
      {
        id: 9,
        name: 'Server-created record',
      },
    ]

    await wrapper.setProps({ data: refreshedRecords })
    await nextTick()

    // AI modified: query invalidation can add rows without also changing the current page boundary.
    expect(visibleRows()).toHaveLength(9)
    expect(wrapper.text()).toContain('Server-created record')

    wrapper.unmount()
  })

  it('rejects unsafe page sizes before they can update table state', () => {
    const allowedPageSizes = getAllowedPageSizes([0, 5, 5, -10, 10.5, 20])

    expect(allowedPageSizes).toEqual([5, 20])
    expect(getAcceptedPageSize('20', allowedPageSizes)).toBe(20)
    expect(getAcceptedPageSize('10', allowedPageSizes)).toBeUndefined()
    expect(getAcceptedPageSize(Number.NaN, allowedPageSizes)).toBeUndefined()
    expect(getAcceptedPageSize({ pageSize: 5 }, allowedPageSizes)).toBeUndefined()
  })

  it('accepts a controlled pagination model without exposing intermediate page-size state', async () => {
    const paginationRequests: PaginationState[] = []
    const wrapper = mountDataTable({
      pagination: { pageIndex: 1, pageSize: 5 },
      'onUpdate:pagination': (pagination: PaginationState) => {
        paginationRequests.push(pagination)
        void wrapper.setProps({ pagination })
      },
    })

    await selectPageSize('Rows per page', 10)
    expect(paginationRequests).toEqual([{ pageIndex: 0, pageSize: 10 }])
    expect(wrapper.text()).toContain('Page 1 of 1')
    expect(visibleRows()).toHaveLength(8)

    wrapper.unmount()
  })

  it('moves from a large page size to a smaller page in one state update', async () => {
    const paginationRequests: PaginationState[] = []
    const wrapper = mountDataTable({
      pagination: { pageIndex: 0, pageSize: 10 },
      'onUpdate:pagination': (pagination: PaginationState) => {
        paginationRequests.push(pagination)
        void wrapper.setProps({ pagination })
      },
    })

    await selectPageSize('Rows per page', 5)
    expect(paginationRequests).toEqual([{ pageIndex: 0, pageSize: 5 }])
    expect(wrapper.text()).toContain('Page 1 of 2')
    expect(visibleRows()).toHaveLength(5)

    wrapper.unmount()
  })

  it('handles zero, exact-page, and rapid last-page boundaries', async () => {
    const emptyTable = mountDataTable({ data: [] })
    expect(emptyTable.text()).toContain('Page 1 of 1')
    expect(emptyTable.text()).toContain('No records')
    expect(emptyTable.get('[aria-label="Previous page"]').attributes('disabled')).toBeDefined()
    expect(emptyTable.get('[aria-label="Next page"]').attributes('disabled')).toBeDefined()
    emptyTable.unmount()

    const exactPageRecords = Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      name: `Exact ${index + 1}`,
    }))
    const exactPageTable = mountDataTable({ data: exactPageRecords })
    await exactPageTable.get('[aria-label="Next page"]').trigger('click')
    expect(exactPageTable.text()).toContain('Page 2 of 2')
    expect(visibleRows()).toHaveLength(5)
    exactPageTable.unmount()

    const threePageRecords = Array.from({ length: 13 }, (_, index) => ({
      id: index + 1,
      name: `Rapid ${index + 1}`,
    }))
    const rapidTable = mountDataTable({ data: threePageRecords })
    await rapidTable.get('[aria-label="Next page"]').trigger('click')
    await rapidTable.get('[aria-label="Next page"]').trigger('click')
    expect(rapidTable.text()).toContain('Page 3 of 3')
    expect(visibleRows()).toHaveLength(3)
    expect(rapidTable.get('[aria-label="Next page"]').attributes('disabled')).toBeDefined()
    rapidTable.unmount()
  })
})
