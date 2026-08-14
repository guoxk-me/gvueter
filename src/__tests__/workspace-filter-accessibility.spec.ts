import type { Ref } from 'vue'
import type { PositionListFilters } from '@/features/positions/types'
import type { SystemParameterListFilters } from '@/features/system-parameters/types'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick } from 'vue'
import PositionsWorkspace from '@/features/positions/components/PositionsWorkspace.vue'
import SystemParametersWorkspace from '@/features/system-parameters/components/SystemParametersWorkspace.vue'
import { i18n, setLocale } from '@/i18n'

const managementFilters = vi.hoisted(() => ({
  positions: undefined as Ref<PositionListFilters> | undefined,
  systemParameters: undefined as Ref<SystemParameterListFilters> | undefined,
}))

vi.mock('@/features/positions/composables/usePositionManagement', async () => {
  const { shallowRef } = await import('vue')
  return {
    usePositionManagement: (filters: Ref<PositionListFilters>) => {
      managementFilters.positions = filters
      return {
        positions: shallowRef([]),
        total: shallowRef(0),
        queryError: shallowRef(null),
        isLoading: shallowRef(false),
        isSaving: shallowRef(false),
        isDeleting: shallowRef(false),
        savePosition: async () => undefined,
        deletePosition: async () => undefined,
      }
    },
  }
})

vi.mock('@/features/system-parameters/composables/useSystemParameterManagement', async () => {
  const { shallowRef } = await import('vue')
  return {
    useSystemParameterManagement: (filters: Ref<SystemParameterListFilters>) => {
      managementFilters.systemParameters = filters
      return {
        parameters: shallowRef([]),
        total: shallowRef(0),
        queryError: shallowRef(null),
        isLoading: shallowRef(false),
        isSaving: shallowRef(false),
        isDeleting: shallowRef(false),
        saveParameter: async () => undefined,
        deleteParameter: async () => undefined,
      }
    },
  }
})

beforeEach(() => {
  setLocale('en-US')
  managementFilters.positions = undefined
  managementFilters.systemParameters = undefined
})

describe('workspace filter accessibility', () => {
  it('names position filters and applies only submitted snapshots', async () => {
    const wrapper = mount(PositionsWorkspace, {
      global: {
        plugins: [i18n],
        stubs: {
          PositionFormDialog: true,
          PositionsTable: true,
        },
      },
    })

    expect(wrapper.get('[role="combobox"]').attributes('aria-label')).toBe('Status')
    expect(managementFilters.positions?.value).toEqual({ keyword: '', status: 'all' })

    await wrapper.get('input[type="search"]').setValue('engineer')
    expect(managementFilters.positions?.value).toEqual({ keyword: '', status: 'all' })

    await wrapper.get('form').trigger('submit')
    expect(managementFilters.positions?.value).toEqual({ keyword: 'engineer', status: 'all' })

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Reset')!
      .trigger('click')
    expect(managementFilters.positions?.value).toEqual({ keyword: '', status: 'all' })
  })

  it('keeps system-parameter filters named and submit-driven after locale changes', async () => {
    const wrapper = mount(SystemParametersWorkspace, {
      global: {
        plugins: [i18n],
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
          SystemParameterFormDialog: true,
          SystemParametersTable: true,
        },
      },
    })

    expect(wrapper.get('[role="combobox"]').attributes('aria-label')).toBe('Status')
    await wrapper.get('input[type="search"]').setValue('security')
    expect(managementFilters.systemParameters?.value).toEqual({ keyword: '', status: 'all' })
    await wrapper.get('form').trigger('submit')
    expect(managementFilters.systemParameters?.value).toEqual({
      keyword: 'security',
      status: 'all',
    })

    setLocale('zh-CN')
    await nextTick()
    expect(wrapper.get('[role="combobox"]').attributes('aria-label')).toBe('状态')
  })
})
