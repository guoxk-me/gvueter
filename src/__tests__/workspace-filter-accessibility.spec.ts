import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick } from 'vue'
import PositionsWorkspace from '@/features/positions/components/PositionsWorkspace.vue'
import SystemParametersWorkspace from '@/features/system-parameters/components/SystemParametersWorkspace.vue'
import { i18n, setLocale } from '@/i18n'

vi.mock('@/features/positions/composables/usePositionManagement', async () => {
  const { shallowRef } = await import('vue')
  return {
    usePositionManagement: () => ({
      positions: shallowRef([]),
      total: shallowRef(0),
      queryError: shallowRef(null),
      isLoading: shallowRef(false),
      isSaving: shallowRef(false),
      isDeleting: shallowRef(false),
      savePosition: async () => undefined,
      deletePosition: async () => undefined,
    }),
  }
})

vi.mock('@/features/system-parameters/composables/useSystemParameterManagement', async () => {
  const { shallowRef } = await import('vue')
  return {
    useSystemParameterManagement: () => ({
      parameters: shallowRef([]),
      total: shallowRef(0),
      queryError: shallowRef(null),
      isLoading: shallowRef(false),
      isSaving: shallowRef(false),
      isDeleting: shallowRef(false),
      saveParameter: async () => undefined,
      deleteParameter: async () => undefined,
    }),
  }
})

beforeEach(() => {
  setLocale('en-US')
})

describe('workspace filter accessibility', () => {
  it('gives the position status filter a stable translated name', () => {
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
  })

  it('keeps the system-parameter status filter named after locale changes', async () => {
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
    setLocale('zh-CN')
    await nextTick()
    expect(wrapper.get('[role="combobox"]').attributes('aria-label')).toBe('状态')
  })
})
