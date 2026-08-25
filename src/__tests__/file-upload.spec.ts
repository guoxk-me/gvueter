import type { FileUploadEntry, FileUploadRejection } from '@/components/admin'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import FileUpload from '@/components/admin/FileUpload.vue'
import { i18n } from '@/i18n'

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

describe('fileUpload', () => {
  it('adds a valid dropped file and unmounts cleanly', async () => {
    const wrapper = mount(FileUpload, {
      props: {
        accept: 'image/*,.pdf',
        maxSize: 1024,
      },
      global: { plugins: [i18n] },
    })
    await nextTick()

    const file = new File(['demo'], 'document.pdf', { type: 'application/pdf' })
    dispatchDrop(wrapper.get('button').element, [file])
    await nextTick()

    const uploadedEntries = wrapper.emitted('change')?.[0]?.[0] as FileUploadEntry[]
    expect(uploadedEntries).toHaveLength(1)
    expect(uploadedEntries[0]?.file).toBe(file)

    wrapper.unmount()
  })

  it('reports files that do not meet the accept rule', async () => {
    const wrapper = mount(FileUpload, {
      props: { accept: 'image/*' },
      global: { plugins: [i18n] },
    })
    await nextTick()

    dispatchDrop(wrapper.get('button').element, [
      new File(['demo'], 'document.pdf', { type: 'application/pdf' }),
    ])
    await nextTick()

    const rejections = wrapper.emitted('rejected')?.[0]?.[0] as FileUploadRejection[]
    expect(rejections).toHaveLength(1)
    expect(rejections[0]?.reason).toBe('invalid-type')
  })
})
