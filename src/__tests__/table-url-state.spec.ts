import type { PaginationState, SortingState } from '@tanstack/vue-table'
import type { TableUrlContract } from '@/composables/use-table-url-state'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { defineComponent, shallowRef } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  getTableUrlQuery,
  getTableUrlState,
  useTableUrlState,
} from '@/composables/use-table-url-state'

enableAutoUnmount(afterEach)

interface ExampleFilters extends Record<string, string> {
  keyword: string
  role: 'all' | 'admin' | 'editor'
  status: 'all' | 'active' | 'suspended'
}

const defaultFilters: ExampleFilters = {
  keyword: '',
  role: 'all',
  status: 'all',
}

const contract: TableUrlContract<ExampleFilters> = {
  defaultFilters,
  defaultPagination: { pageIndex: 0, pageSize: 5 },
  defaultSorting: [{ id: 'createdAt', desc: true }],
  filterRules: {
    keyword: { queryKey: 'keyword' },
    role: { queryKey: 'role', acceptedValues: ['all', 'admin', 'editor'] },
    status: { queryKey: 'status', acceptedValues: ['all', 'active', 'suspended'] },
  },
  pageSizeOptions: [5, 10, 20, 50],
  sortColumnIds: ['createdAt', 'email', 'name', 'role', 'status'],
}

describe('table URL state contract', () => {
  it('accepts allowlisted pagination, sorting, and filters', () => {
    expect(
      getTableUrlState(
        {
          page: '3',
          pageSize: '20',
          sortBy: 'email',
          sortOrder: 'asc',
          keyword: 'smith',
          role: 'editor',
          status: 'active',
        },
        contract,
      ),
    ).toEqual({
      filters: { keyword: 'smith', role: 'editor', status: 'active' },
      pagination: { pageIndex: 2, pageSize: 20 },
      sorting: [{ id: 'email', desc: false }],
    })
  })

  it('falls back from malformed or unknown query entries', () => {
    expect(
      getTableUrlState(
        {
          page: '0',
          pageSize: '7',
          sortBy: '__proto__',
          sortOrder: 'sideways',
          keyword: ['first', 'second'],
          role: 'owner',
          status: null,
        },
        contract,
      ),
    ).toEqual({
      filters: defaultFilters,
      pagination: { pageIndex: 0, pageSize: 5 },
      sorting: [{ id: 'createdAt', desc: true }],
    })
  })

  it('preserves unrelated query state and encodes an explicit unsorted state', () => {
    expect(
      getTableUrlQuery(
        { tab: 'audit', page: '9', role: 'admin' },
        {
          filters: { keyword: 'Ada', role: 'editor', status: 'all' },
          pagination: { pageIndex: 1, pageSize: 10 },
          sorting: [],
        },
        contract,
      ),
    ).toEqual({
      tab: 'audit',
      page: '2',
      pageSize: '10',
      sortBy: 'none',
      keyword: 'Ada',
      role: 'editor',
    })
  })

  it('reacts to same-route history changes and writes table interactions atomically', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/users', component: { template: '<div />' } }],
    })
    await router.push('/users?page=2&pageSize=10&role=admin&tab=audit')
    await router.isReady()

    const UrlStateHarness = defineComponent({
      setup() {
        const filters = shallowRef<ExampleFilters>({ ...defaultFilters })
        const pagination = shallowRef<PaginationState>({ ...contract.defaultPagination })
        const sorting = shallowRef<SortingState>(
          contract.defaultSorting.map((columnSort) => ({ ...columnSort })),
        )
        useTableUrlState({ filters, pagination, sorting, ...contract })

        function goToThirdPage(): void {
          pagination.value = { ...pagination.value, pageIndex: 2 }
        }

        return { filters, goToThirdPage, pagination, sorting }
      },
      template: `
        <div>
          <output data-testid="state">
            {{ pagination.pageIndex }}|{{ pagination.pageSize }}|{{ filters.role }}|{{ sorting[0]?.id ?? 'none' }}
          </output>
          <button type="button" @click="goToThirdPage">Third page</button>
        </div>
      `,
    })
    const wrapper = mount(UrlStateHarness, { global: { plugins: [router] } })

    expect(wrapper.get('[data-testid="state"]').text()).toBe('1|10|admin|createdAt')

    await router.push(
      '/users?page=4&pageSize=20&sortBy=email&sortOrder=asc&status=active&tab=audit',
    )
    await flushPromises()
    expect(wrapper.get('[data-testid="state"]').text()).toBe('3|20|all|email')

    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => {
      expect(router.currentRoute.value.query).toEqual({
        page: '3',
        pageSize: '20',
        sortBy: 'email',
        sortOrder: 'asc',
        status: 'active',
        tab: 'audit',
      })
    })

    await router.push('/users?page=0&pageSize=999&role=owner&tab=audit')
    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="state"]').text()).toBe('0|5|all|createdAt')
      expect(router.currentRoute.value.query).toEqual({ tab: 'audit' })
    })
  })
})
