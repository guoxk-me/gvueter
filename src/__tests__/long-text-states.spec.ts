import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { toast } from 'vue-sonner'
import { Dialog, Drawer, EmptyState, FileUpload } from '@/components/admin'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Toaster } from '@/components/ui/sonner'
import UserTable from '@/features/users/components/UserTable.vue'
import { i18n, setLocale } from '@/i18n'

enableAutoUnmount(afterEach)

const LONG_ENGLISH_COPY
  = 'The upstream administration service returned a detailed validation failure that operators must be able to read before retrying the request.'
const UNBROKEN_IDENTIFIER = `tenant_${'permissionBoundary'.repeat(12)}`

function openSelect(trigger: HTMLButtonElement): void {
  trigger.hasPointerCapture = () => false
  trigger.setPointerCapture = () => undefined
  trigger.releasePointerCapture = () => undefined
  const openEvent = new MouseEvent('pointerdown', { bubbles: true, button: 0 })
  Object.defineProperties(openEvent, {
    pointerId: { value: 1 },
    pointerType: { value: 'mouse' },
  })
  trigger.dispatchEvent(openEvent)
}

beforeEach(() => {
  setLocale('en-US')
  document.body.innerHTML = ''
})

afterEach(() => {
  toast.dismiss()
})

describe('long text rendering boundaries', () => {
  it('keeps long and unbroken Select content in the rendered accessible option tree', async () => {
    // AI modified: exercise the real Reka Select portal so long labels cannot disappear behind a test stub.
    const SelectHarness = defineComponent({
      components: { Select, SelectContent, SelectItem, SelectTrigger, SelectValue },
      setup: () => ({ LONG_ENGLISH_COPY, UNBROKEN_IDENTIFIER }),
      template: `
        <Select :model-value="UNBROKEN_IDENTIFIER">
          <SelectTrigger aria-label="Deployment target" class="max-w-full min-w-0">
            <SelectValue>{{ UNBROKEN_IDENTIFIER }}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="UNBROKEN_IDENTIFIER">{{ UNBROKEN_IDENTIFIER }}</SelectItem>
            <SelectItem value="translated-copy">{{ LONG_ENGLISH_COPY }}</SelectItem>
          </SelectContent>
        </Select>
      `,
    })
    const wrapper = mount(SelectHarness, { attachTo: document.body })
    const trigger = wrapper.get<HTMLButtonElement>('[data-slot="select-trigger"]')

    expect(trigger.text()).toContain(UNBROKEN_IDENTIFIER)
    expect(trigger.classes()).toEqual(expect.arrayContaining(['max-w-full', 'min-w-0']))
    openSelect(trigger.element)
    await nextTick()

    const options = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')]
    const optionLabels = options.map(option => option.textContent?.trim())
    expect(optionLabels).toEqual([UNBROKEN_IDENTIFIER, LONG_ENGLISH_COPY])
    expect(options.every(option => option.classList.contains('min-w-0'))).toBe(true)
    expect(options.every(option => option.classList.contains('whitespace-normal'))).toBe(true)
    expect(options.every(option => option.classList.contains('break-words'))).toBe(true)
    expect(document.body.querySelector('[data-slot="select-content"]')).not.toBeNull()
  })

  it('renders a long unbroken Sonner error in its live region without losing detail', async () => {
    // AI modified: use the actual Sonner store and DOM instead of asserting only that toast.error was called.
    mount(Toaster, {
      attachTo: document.body,
      props: { duration: 60_000, position: 'top-right', richColors: true },
    })
    toast.error(UNBROKEN_IDENTIFIER, {
      description: LONG_ENGLISH_COPY,
      duration: 60_000,
      testId: 'long-error-toast',
    })
    await nextTick()
    await flushPromises()

    const toastNode = document.body.querySelector<HTMLElement>('[data-testid="long-error-toast"]')
    expect(toastNode).not.toBeNull()
    expect(toastNode?.querySelector('[data-title]')?.textContent).toBe(UNBROKEN_IDENTIFIER)
    expect(toastNode?.querySelector('[data-description]')?.textContent).toBe(LONG_ENGLISH_COPY)
    expect(toastNode?.closest('section')?.getAttribute('aria-live')).toBe('polite')
    expect(getComputedStyle(toastNode!).overflowWrap).toBe('anywhere')
  })

  it('preserves unbroken overlay, badge, and empty-state copy in the DOM', async () => {
    const dialog = mount(Dialog, {
      attachTo: document.body,
      props: { open: true, title: UNBROKEN_IDENTIFIER, description: LONG_ENGLISH_COPY },
      global: { plugins: [i18n] },
    })
    await nextTick()
    expect(document.body.querySelector('[data-slot="dialog-title"]')?.textContent).toBe(
      UNBROKEN_IDENTIFIER,
    )
    expect(document.body.querySelector('[data-slot="dialog-description"]')?.textContent).toBe(
      LONG_ENGLISH_COPY,
    )
    dialog.unmount()

    const drawer = mount(Drawer, {
      attachTo: document.body,
      props: { open: true, title: UNBROKEN_IDENTIFIER, description: LONG_ENGLISH_COPY },
      global: { plugins: [i18n] },
    })
    await nextTick()
    expect(document.body.querySelector('[data-slot="sheet-title"]')?.textContent).toBe(
      UNBROKEN_IDENTIFIER,
    )
    expect(document.body.querySelector('[data-slot="sheet-description"]')?.textContent).toBe(
      LONG_ENGLISH_COPY,
    )
    drawer.unmount()

    const badge = mount(Badge, {
      attrs: { title: UNBROKEN_IDENTIFIER },
      slots: { default: UNBROKEN_IDENTIFIER },
    })
    expect(badge.text()).toBe(UNBROKEN_IDENTIFIER)
    expect(badge.classes()).toEqual(expect.arrayContaining(['max-w-full', 'truncate']))
    expect(badge.attributes('title')).toBe(UNBROKEN_IDENTIFIER)

    const emptyState = mount(EmptyState, {
      props: { title: UNBROKEN_IDENTIFIER, description: LONG_ENGLISH_COPY },
    })
    expect(emptyState.get('h2').text()).toBe(UNBROKEN_IDENTIFIER)
    expect(emptyState.get('h2').classes()).toContain('break-words')
    expect(emptyState.get('p').text()).toBe(LONG_ENGLISH_COPY)
  })

  it('keeps a long email available when the table cell is visually truncated', () => {
    const longEmail = `${'release.operator.'.repeat(8)}@${'regional-service.'.repeat(5)}example.com`
    const wrapper = mount(UserTable, {
      props: {
        users: [
          {
            id: 91,
            name: 'Release operator',
            email: longEmail,
            role: 'viewer',
            status: 'active',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
        isLoading: false,
        canManage: true,
        canDelete: false,
        canImport: false,
        pagination: { pageIndex: 0, pageSize: 5 },
        sorting: [],
        selectedRowIds: {},
      },
      global: { plugins: [i18n] },
    })
    const email = wrapper.get('[data-masked="false"]')

    expect(email.text()).toBe(longEmail)
    expect(email.attributes()).toMatchObject({ title: longEmail, translate: 'no' })
    expect(email.classes()).toContain('truncate')
  })

  it('retains a safe long file name in visible and accessible upload output', async () => {
    const longFileName = `${'quarterly-financial-reconciliation-'.repeat(4)}2026.csv`
    const wrapper = mount(FileUpload, {
      props: { accept: '.csv' },
      global: { plugins: [i18n] },
    })
    await nextTick()
    const file = new File(['account,total'], longFileName, { type: 'text/csv' })
    const dropEvent = new Event('drop') as DragEvent
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files: [file], items: [{ type: file.type }] },
    })
    wrapper.get('button').element.dispatchEvent(dropEvent)
    await nextTick()

    expect(wrapper.get('p.truncate').text()).toBe(longFileName)
    expect(wrapper.get('p.truncate').attributes('title')).toBe(longFileName)
    expect(wrapper.find(`button[aria-label="Remove file: ${longFileName}"]`).exists()).toBe(true)
  })
})
