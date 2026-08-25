import type { User } from '@/stores/auth'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppearancePanel from '@/components/layout/AppearancePanel.vue'
import GlobalSearch from '@/components/layout/GlobalSearch.vue'
import ComponentsFeedbackDemo from '@/features/component-gallery/components/ComponentsFeedbackDemo.vue'
import { i18n, setLocale } from '@/i18n'
import { updateAbility } from '@/lib/ability'
import { getTestAuthorization } from './auth-test-helpers'

const adminUser: User = {
  id: 1,
  name: 'Admin',
  email: 'admin@example.com',
  role: 'admin',
  status: 'active',
  createdAt: '2026-01-01T08:00:00.000Z',
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
  setLocale('en-US')
})

afterEach(() => {
  updateAbility(null)
})

describe('p0 long-content source contracts', () => {
  it('keeps global-search result labels shrinkable with explicit full-text titles', async () => {
    updateAbility(adminUser, getTestAuthorization(adminUser))
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
    })
    await router.push('/')
    const wrapper = mount(GlobalSearch, {
      attachTo: document.body,
      global: { plugins: [router, i18n] },
    })

    await wrapper.get('button').trigger('click')
    await nextTick()

    const resultRow = document.body.querySelector<HTMLButtonElement>(
      '[data-slot="dialog-content"] .max-h-72 button',
    )
    expect(resultRow).not.toBeNull()
    expect(resultRow?.classList.contains('min-w-0')).toBe(true)

    const labels = resultRow?.querySelectorAll<HTMLSpanElement>('span[title]') ?? []
    expect(labels).toHaveLength(2)
    expect(labels[0]?.classList.contains('min-w-0')).toBe(true)
    expect(labels[0]?.classList.contains('truncate')).toBe(true)
    expect(labels[0]?.getAttribute('title')).toBe(labels[0]?.textContent?.trim())
    expect(labels[1]?.classList.contains('max-w-[40%]')).toBe(true)
    expect(labels[1]?.classList.contains('truncate')).toBe(true)
    expect(labels[1]?.getAttribute('title')).toBe(labels[1]?.textContent?.trim())
  })

  it('uses container-sized auto-fit groups throughout the appearance Sheet', async () => {
    const pinia = createPinia()
    mount(AppearancePanel, {
      attachTo: document.body,
      props: { open: true },
      global: { plugins: [pinia, i18n] },
    })
    await nextTick()

    const sheet = document.body.querySelector('[data-slot="sheet-content"]')
    const optionGroups = sheet?.querySelectorAll('.settings-option-grid') ?? []
    expect(sheet?.classList.contains('sm:max-w-md')).toBe(true)
    expect(optionGroups.length).toBeGreaterThanOrEqual(10)
    expect(sheet?.querySelector('.settings-option-grid--compact')).not.toBeNull()
    expect(sheet?.querySelector('.settings-option-grid--balanced')).not.toBeNull()
    expect(sheet?.querySelector('.settings-option-grid--wide')).not.toBeNull()
    expect(sheet?.querySelector('[class*="min-["]')).toBeNull()
  })

  it('lets the feedback state picker wrap and shrink with translated copy', () => {
    const wrapper = mount(ComponentsFeedbackDemo, {
      global: { plugins: [i18n] },
    })

    const selectTrigger = wrapper.get('[data-slot="select-trigger"]')
    const pickerRow = selectTrigger.element.parentElement
    expect(pickerRow?.classList.contains('min-w-0')).toBe(true)
    expect(pickerRow?.classList.contains('flex-wrap')).toBe(true)
    expect(selectTrigger.classes()).toContain('min-w-0')
    expect(selectTrigger.classes()).toContain('flex-1')
    expect(selectTrigger.classes()).toContain('basis-36')
    expect(selectTrigger.classes()).not.toContain('w-36')
  })
})
