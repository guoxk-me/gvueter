import type { CsvExportColumn, FileUploadEntry } from '@/components/admin'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { http, HttpResponse } from 'msw'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import {
  DetailDescriptions,
  Dialog,
  DictSelect,
  Drawer,
  EmptyState,
  ExportButton,
  ImageUpload,
  ImportDialog,
  Pagination,
  StatusTag,
  Upload,
} from '@/components/admin'
import { Badge } from '@/components/ui/badge'
import { i18n, setLocale } from '@/i18n'
import { server } from '@/mocks/node'

enableAutoUnmount(afterEach)

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function dispatchDrop(target: HTMLButtonElement, files: File[]): void {
  const event = new Event('drop') as DragEvent
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      files,
      items: files.map(file => ({ type: file.type })),
    },
  })
  target.dispatchEvent(event)
}

beforeEach(() => {
  setLocale('en-US')
  document.body.innerHTML = ''
})

describe('business pagination and overlays', () => {
  it('keeps long overlay, badge, and empty-state copy inside shrinkable surfaces', async () => {
    // AI modified: one boundary fixture exercises 150%-style copy across reusable overlay surfaces.
    const longTitle
      = 'Exceptionally long translated review request requiring complete operator context'
    const dialogWrapper = mount(Dialog, {
      attachTo: document.body,
      props: { open: true, title: longTitle, description: `${longTitle} description` },
      slots: {
        headerActions: '<button type="button">Exceptionally long header operation</button>',
      },
      global: { plugins: [i18n] },
    })
    await nextTick()
    expect(document.body.querySelector('[data-slot="dialog-title"]')?.className).toContain(
      'break-words',
    )
    expect(document.body.querySelector('[data-slot="dialog-header"] .flex-wrap')).not.toBeNull()
    dialogWrapper.unmount()

    const drawerWrapper = mount(Drawer, {
      attachTo: document.body,
      props: { open: true, title: longTitle, description: `${longTitle} description` },
      slots: {
        headerActions: '<button type="button">Exceptionally long drawer operation</button>',
      },
      global: { plugins: [i18n] },
    })
    await nextTick()
    expect(document.body.querySelector('[data-slot="sheet-title"]')?.className).toContain(
      'break-words',
    )
    expect(document.body.querySelector('[data-slot="sheet-header"] .flex-wrap')).not.toBeNull()
    drawerWrapper.unmount()

    const emptyState = mount(EmptyState, {
      props: { title: longTitle, description: `${longTitle} description` },
      slots: { actions: '<button type="button">Exceptionally long recovery operation</button>' },
    })
    expect(emptyState.get('h2').classes()).toContain('break-words')
    expect(emptyState.get('.flex-wrap').classes()).toContain('flex-wrap')

    const badge = mount(Badge, { slots: { default: longTitle } })
    expect(badge.classes()).toContain('max-w-full')
    expect(badge.text()).toBe(longTitle)
  })

  it('emits the controlled page and server pagination snapshot', async () => {
    const wrapper = mount(Pagination, {
      props: { page: 2, pageSize: 10, total: 48 },
      global: { plugins: [i18n] },
    })

    await wrapper.get('[aria-label="Next page"]').trigger('click')

    expect(wrapper.emitted('update:page')?.[0]).toEqual([3])
    expect(wrapper.emitted('change')?.[0]).toEqual([{ page: 3, pageSize: 10 }])
  })

  it('localizes dialog and drawer close controls and updates controlled visibility', async () => {
    const dialogWrapper = mount(Dialog, {
      attachTo: document.body,
      props: { open: true, title: 'Review request' },
      global: { plugins: [i18n] },
    })
    await nextTick()
    const dialogClose = document.body.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')
    expect(dialogClose?.textContent).toContain('Close')
    dialogClose?.click()
    await nextTick()
    const dialogVisibilityEvents = dialogWrapper.emitted('update:open')
    expect(dialogVisibilityEvents?.[dialogVisibilityEvents.length - 1]).toEqual([false])
    dialogWrapper.unmount()

    const drawerWrapper = mount(Drawer, {
      attachTo: document.body,
      props: { open: true, title: 'Request details' },
      global: { plugins: [i18n] },
    })
    await nextTick()
    const drawerClose = document.body.querySelector<HTMLButtonElement>(
      '[data-slot="sheet-content"] button',
    )
    expect(drawerClose?.textContent).toContain('Close')
    drawerClose?.click()
    await nextTick()
    const drawerVisibilityEvents = drawerWrapper.emitted('update:open')
    expect(drawerVisibilityEvents?.[drawerVisibilityEvents.length - 1]).toEqual([false])
  })
})

describe('business uploads and data actions', () => {
  it('uses the shared upload validation contract', async () => {
    const wrapper = mount(Upload, {
      props: { accept: '.csv', maxFiles: 1 },
      global: { plugins: [i18n] },
    })
    await nextTick()

    const file = new File(['id,name'], 'records.csv', { type: 'text/csv' })
    dispatchDrop(wrapper.get('button').element, [file])
    await nextTick()
    await nextTick()

    const entries = wrapper.emitted('change')?.[0]?.[0] as FileUploadEntry[]
    expect(entries[0]?.file).toBe(file)
  })

  it('creates and releases image preview URLs with the controlled collection', async () => {
    const createObjectUrl = vi.fn(() => 'blob:image-preview')
    const revokeObjectUrl = vi.fn()
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectUrl,
      revokeObjectURL: revokeObjectUrl,
    })

    const wrapper = mount(ImageUpload, {
      global: { plugins: [i18n] },
    })
    await nextTick()
    const file = new File(['image'], 'avatar.png', { type: 'image/png' })
    dispatchDrop(wrapper.get('button').element, [file])
    await nextTick()

    expect(wrapper.get('img').attributes('src')).toBe('blob:image-preview')
    wrapper.unmount()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:image-preview')
  })

  it('submits a validated import file to the parent', async () => {
    const wrapper = mount(ImportDialog, {
      attachTo: document.body,
      props: { open: true },
      global: { plugins: [i18n] },
    })
    await nextTick()

    const file = new File(['id,name'], 'records.csv', { type: 'text/csv' })
    const dropZone = document.body.querySelector<HTMLButtonElement>(
      '[data-slot="dialog-content"] button',
    )
    expect(dropZone).not.toBeNull()
    dispatchDrop(dropZone!, [file])
    await nextTick()

    const importButton = [
      ...document.body.querySelectorAll<HTMLButtonElement>('[data-slot="dialog-content"] button'),
    ].find(button => button.textContent?.includes('Start import'))
    expect(importButton?.disabled).toBe(false)
    importButton?.click()
    expect(wrapper.emitted('import')?.[0]).toEqual([file])
  })

  it('delegates safe CSV downloads and reports the exported row count', async () => {
    const rows: readonly unknown[] = [{ id: '1', value: '=unsafe' }]
    const columns: readonly CsvExportColumn<unknown>[] = [
      { label: 'Value', getValue: row => (row as { value: string }).value },
    ]
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:csv')
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const clickDownload = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)
    const wrapper = mount(ExportButton, {
      props: { rows, columns },
      global: { plugins: [i18n] },
    })

    await wrapper.get('button').trigger('click')

    expect(createObjectUrl).toHaveBeenCalledOnce()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:csv')
    expect(clickDownload).toHaveBeenCalledOnce()
    expect(wrapper.emitted('export')?.[0]).toEqual([1])
  })
})

describe('dictionary and detail components', () => {
  it('does not fetch a remote dictionary when the caller supplies static options', async () => {
    let requestCount = 0
    server.use(
      http.get('/api/dictionaries/options/release_status', () => {
        requestCount += 1
        return HttpResponse.json({
          code: 0,
          message: 'success',
          data: { code: 'release_status', options: [] },
        })
      }),
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    mount(DictSelect, {
      props: {
        code: 'release_status',
        options: [{ label: 'Draft', value: 'draft', color: 'secondary', isDisabled: false }],
      },
      global: { plugins: [createPinia(), i18n, [VueQueryPlugin, { queryClient }]] },
    })

    await flushPromises()
    expect(requestCount).toBe(0)
  })

  it('keeps remote dictionary failures visible and retryable', async () => {
    let requestCount = 0
    server.use(
      http.get('/api/dictionaries/options/retry_status', () => {
        requestCount += 1
        if (requestCount === 1) {
          return HttpResponse.json(
            { code: 'DICTIONARY_UNAVAILABLE', message: 'Unavailable', data: null },
            { status: 500 },
          )
        }
        return HttpResponse.json({
          code: 0,
          message: 'success',
          data: {
            code: 'retry_status',
            options: [{ label: 'Ready', value: 'ready', color: 'success', isDisabled: false }],
          },
        })
      }),
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = mount(DictSelect, {
      props: { code: 'retry_status', label: 'Retryable status' },
      global: { plugins: [createPinia(), i18n, [VueQueryPlugin, { queryClient }]] },
    })

    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Unable to load content')
    expect(wrapper.get('[data-slot="select-trigger"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(requestCount).toBe(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('[data-slot="select-trigger"]').attributes('disabled')).toBeUndefined()
  })

  it('emits dictionary metadata from a static option contract', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = mount(DictSelect, {
      attachTo: document.body,
      props: {
        code: '',
        options: [
          { label: 'Active', value: 'active', color: 'success', isDisabled: false },
          { label: 'Suspended', value: 'suspended', color: 'destructive', isDisabled: true },
        ],
      },
      global: { plugins: [createPinia(), i18n, [VueQueryPlugin, { queryClient }]] },
    })

    const openEvent = new MouseEvent('pointerdown', { bubbles: true, button: 0 })
    Object.defineProperty(openEvent, 'pointerType', { value: 'mouse' })
    Object.defineProperty(openEvent, 'pointerId', { value: 1 })
    const selectTrigger = wrapper.get('[data-slot="select-trigger"]').element as HTMLButtonElement
    selectTrigger.hasPointerCapture = () => false
    selectTrigger.setPointerCapture = () => undefined
    selectTrigger.releasePointerCapture = () => undefined
    selectTrigger.dispatchEvent(openEvent)
    await nextTick()
    const option = document.body.querySelector<HTMLElement>('[data-slot="select-item"]')
    expect(option).not.toBeNull()
    option?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    option?.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
    await nextTick()
    await nextTick()
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['active'])
    expect(wrapper.emitted('change')?.[0]?.[0]).toMatchObject({
      value: 'active',
      option: { label: 'Active', color: 'success' },
    })
  })

  it('uses semantic theme tokens for statuses and responsive detail fields', () => {
    const statusWrapper = mount(StatusTag, { props: { label: 'Healthy', tone: 'success' } })
    expect(statusWrapper.classes()).toContain('text-success')

    const detailsWrapper = mount(DetailDescriptions, {
      props: {
        items: [
          { key: 'id', label: 'Account', value: 'OPS-001', copyable: true },
          { key: 'status', label: 'Status', value: 'Healthy', tone: 'success' },
        ],
      },
      global: { plugins: [i18n] },
    })
    expect(detailsWrapper.text()).toContain('OPS-001')
    expect(detailsWrapper.find('[aria-label="Copy Account"]').exists()).toBe(true)
    expect(detailsWrapper.find('.text-success').exists()).toBe(true)
  })
})
