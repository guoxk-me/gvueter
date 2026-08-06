import type { SearchFormField, SearchFormValues } from '@/components/admin/search-form'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { defineComponent, nextTick, shallowRef } from 'vue'
import { toast } from 'vue-sonner'
import DateRangePicker from '@/components/admin/DateRangePicker.vue'
import Drawer from '@/components/admin/Drawer.vue'
import SearchForm from '@/components/admin/SearchForm.vue'
import AppearancePanel from '@/components/layout/AppearancePanel.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Toaster } from '@/components/ui/sonner'
import { i18n, setLocale } from '@/i18n'

enableAutoUnmount(afterEach)

beforeEach(() => {
  setLocale('en-US')
  toast.dismiss()
})

afterEach(() => {
  toast.dismiss()
})

describe('shared accessibility contracts', () => {
  it('gives icon-sized Buttons a native title from their readable label', () => {
    const inheritedTitle = mount(Button, {
      attrs: { 'aria-label': 'Open filters' },
      props: { size: 'icon-sm' },
      slots: { default: '<svg aria-hidden="true" />' },
    })
    const explicitTitle = mount(Button, {
      attrs: { 'aria-label': 'Open filters', title: 'Filter customer records' },
      props: { size: 'icon-sm' },
      slots: { default: '<svg aria-hidden="true" />' },
    })

    expect(inheritedTitle.get('button').attributes()).toMatchObject({
      'aria-label': 'Open filters',
      title: 'Open filters',
    })
    expect(explicitTitle.get('button').attributes('title')).toBe('Filter customer records')
  })

  it('keeps repeated search and date filters on unique label targets', async () => {
    interface SearchValues extends SearchFormValues {
      keyword: string
    }

    const fields: readonly SearchFormField<SearchValues>[] = [
      { name: 'keyword', type: 'search', label: 'Keyword' },
    ]
    const FiltersHost = defineComponent({
      components: { DateRangePicker, SearchForm },
      setup() {
        const firstSearch = shallowRef<SearchValues>({ keyword: '' })
        const secondSearch = shallowRef<SearchValues>({ keyword: '' })
        const firstRangeOpen = shallowRef(true)
        const secondRangeOpen = shallowRef(true)
        return {
          defaultSearch: { keyword: '' },
          fields,
          firstRangeOpen,
          firstSearch,
          secondRangeOpen,
          secondSearch,
        }
      },
      template: `
        <div>
          <SearchForm v-model="firstSearch" :fields="fields" :default-values="defaultSearch" search-label="Search" reset-label="Reset" />
          <SearchForm v-model="secondSearch" :fields="fields" :default-values="defaultSearch" search-label="Search" reset-label="Reset" />
          <DateRangePicker v-model:open="firstRangeOpen" label="First active range" />
          <DateRangePicker v-model:open="secondRangeOpen" label="Second active range" />
        </div>
      `,
    })
    const wrapper = mount(FiltersHost, { attachTo: document.body })
    await nextTick()
    await flushPromises()

    const searchInputs = wrapper.findAll<HTMLInputElement>('input[type="search"]')
    const searchLabels = wrapper.findAll('label')
    expect(searchInputs).toHaveLength(2)
    expect(new Set(searchInputs.map((input) => input.attributes('id'))).size).toBe(2)
    expect(searchLabels.map((label) => label.attributes('for'))).toEqual(
      searchInputs.map((input) => input.attributes('id')),
    )

    const dateRangeTriggers = [
      ...document.body.querySelectorAll<HTMLButtonElement>('button[aria-label="First active range"]'),
      ...document.body.querySelectorAll<HTMLButtonElement>('button[aria-label="Second active range"]'),
    ]
    expect(dateRangeTriggers).toHaveLength(2)
    expect(new Set(dateRangeTriggers.map((trigger) => trigger.getAttribute('aria-label'))).size).toBe(
      2,
    )
    for (const trigger of dateRangeTriggers) {
      expect(trigger.getAttribute('aria-label')?.trim().length).toBeGreaterThan(0)
    }
  })

  it('labels the dialog close action and restores focus to its trigger', async () => {
    const DialogHost = defineComponent({
      components: { Dialog, DialogContent, DialogTitle, DialogTrigger },
      template: `
        <Dialog>
          <DialogTrigger data-testid="dialog-trigger">Open dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Accessible dialog</DialogTitle>
            <button type="button">Primary action</button>
          </DialogContent>
        </Dialog>
      `,
    })
    const wrapper = mount(DialogHost, {
      attachTo: document.body,
      global: { plugins: [i18n] },
    })
    const trigger = wrapper.get<HTMLButtonElement>('[data-testid="dialog-trigger"]')
    await trigger.trigger('click')
    await nextTick()
    await flushPromises()

    const closeButton = document.body.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')
    expect(closeButton).not.toBeNull()
    expect(closeButton?.getAttribute('aria-label')).toBe('Close')
    expect(closeButton?.getAttribute('title')).toBe('Close')
    closeButton?.click()
    await nextTick()
    await flushPromises()
    expect(document.activeElement).toBe(trigger.element)
  })

  it('keeps Drawer focus modal and returns it to the opening action', async () => {
    const DrawerHost = defineComponent({
      components: { Drawer },
      setup() {
        const isDrawerOpen = shallowRef(false)
        return { isDrawerOpen }
      },
      template: `
        <div>
          <button type="button" data-testid="drawer-trigger" @click="isDrawerOpen = true">Open drawer</button>
          <Drawer v-model:open="isDrawerOpen" title="Accessible drawer" description="Drawer focus contract">
            <button type="button">Drawer action</button>
          </Drawer>
        </div>
      `,
    })
    const wrapper = mount(DrawerHost, {
      attachTo: document.body,
      global: { plugins: [i18n] },
    })
    const trigger = wrapper.get<HTMLButtonElement>('[data-testid="drawer-trigger"]')
    trigger.element.focus()
    await trigger.trigger('click')
    await nextTick()
    await flushPromises()

    const drawer = document.body.querySelector<HTMLElement>('[data-slot="sheet-content"]')
    const closeButton = drawer?.querySelector<HTMLButtonElement>('button[aria-label="Close"]')
    expect(drawer?.getAttribute('role')).toBe('dialog')
    expect(closeButton?.getAttribute('title')).toBe('Close')
    closeButton?.click()
    await nextTick()
    await flushPromises()
    expect(document.activeElement).toBe(trigger.element)
  })

  it('uses localized polite announcements and close labels for toast feedback', async () => {
    setLocale('zh-CN')
    mount(Toaster, {
      attachTo: document.body,
      props: {
        closeButton: true,
        containerAriaLabel: '通知',
        duration: 60_000,
        toastOptions: { closeButtonAriaLabel: '关闭' },
      },
    })
    toast.success('保存成功')
    await nextTick()
    await flushPromises()

    const liveRegion = document.body.querySelector<HTMLElement>('section[aria-live="polite"]')
    const closeButton = document.body.querySelector<HTMLButtonElement>('[data-close-button]')
    expect(liveRegion?.getAttribute('aria-label')).toContain('通知')
    expect(closeButton?.getAttribute('aria-label')).toBe('关闭')
    expect(document.body.querySelector('[data-icon] svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('names every Appearance switch and exposes selected options without color alone', async () => {
    mount(AppearancePanel, {
      attachTo: document.body,
      props: { open: true },
      global: { plugins: [createPinia(), i18n] },
    })
    await nextTick()
    await flushPromises()

    const sheet = document.body.querySelector<HTMLElement>('[data-slot="sheet-content"]')
    expect(sheet).not.toBeNull()
    const switches = [...sheet!.querySelectorAll<HTMLElement>('[data-slot="switch"]')]
    expect(switches.length).toBeGreaterThan(4)
    for (const switchControl of switches) {
      const labelId = switchControl.getAttribute('aria-labelledby')
      expect(labelId).toBeTruthy()
      expect(document.getElementById(labelId ?? '')?.textContent?.trim().length).toBeGreaterThan(0)
    }

    const optionButtons = [
      ...sheet!.querySelectorAll<HTMLButtonElement>('button[class*="border-2"]'),
    ]
    expect(optionButtons.length).toBeGreaterThan(10)
    expect(optionButtons.every((button) => button.hasAttribute('aria-pressed'))).toBe(true)
    expect(optionButtons.some((button) => button.getAttribute('aria-pressed') === 'true')).toBe(
      true,
    )
  })

  it('requires an explicit readable name on every non-proxy icon Button callsite', () => {
    const componentSources = import.meta.glob<string>('../**/*.vue', {
      eager: true,
      import: 'default',
      query: '?raw',
    })
    const missingReadableNames: string[] = []

    for (const [filePath, source] of Object.entries(componentSources)) {
      for (const buttonMatch of source.matchAll(/<Button\b([^>]*)>/g)) {
        const attributes = buttonMatch[1] ?? ''
        const isIconButton = /\bsize="icon(?:-sm|-lg)?"/.test(attributes)
        const delegatesToChild = /\bas-child\b/.test(attributes)
        if (isIconButton && !delegatesToChild && !/:?aria-label=/.test(attributes))
          missingReadableNames.push(filePath)
      }
    }

    expect(missingReadableNames).toEqual([])
  })

  it('rejects detached form labels while allowing labels that wrap their native control', () => {
    const componentSources = import.meta.glob<string>('../**/*.vue', {
      eager: true,
      import: 'default',
      query: '?raw',
    })
    const detachedLabels: string[] = []

    for (const [filePath, source] of Object.entries(componentSources)) {
      if (!filePath.endsWith('/ui/label/Label.vue')) {
        for (const labelMatch of source.matchAll(/<Label\b([^>]*)>/g)) {
          if (!/:?for=/.test(labelMatch[1] ?? '')) detachedLabels.push(filePath)
        }
      }

      for (const labelMatch of source.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/g)) {
        const attributes = labelMatch[1] ?? ''
        const contents = labelMatch[2] ?? ''
        const wrapsControl = /<(?:input|select|textarea|Input|Select|Textarea)\b/.test(contents)
        if (!/:?for=/.test(attributes) && !wrapsControl) detachedLabels.push(filePath)
      }
    }

    expect(detachedLabels).toEqual([])
  })
})
