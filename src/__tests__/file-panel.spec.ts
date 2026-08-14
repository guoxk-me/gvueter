import type { Ref } from 'vue'
import type { FileUploadEntry } from '@/components/admin'
import type { ContentFileUploadOutcome } from '@/features/content-admin/composables/useFileManagement'
import type {
  ContentFileListFilters,
  ContentFileRecord,
} from '@/features/content-admin/types/files'
import type { UploadPolicy } from '@/features/uploads/types'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { defineComponent, nextTick } from 'vue'
import Upload from '@/components/admin/Upload.vue'
import FilePanel from '@/features/content-admin/components/FilePanel.vue'
import { i18n, setLocale } from '@/i18n'

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}))

const filePanelState = vi.hoisted(() => ({
  filters: undefined as Ref<ContentFileListFilters> | undefined,
  files: [] as ContentFileRecord[],
  total: 0,
  totalRef: undefined as Ref<number> | undefined,
  queryError: null as Error | null,
  queryErrorRef: undefined as Ref<Error | null> | undefined,
  policy: undefined as UploadPolicy | undefined,
  policyError: null as Error | null,
  isPolicyLoading: false,
  uploadOutcome: { uploadedFiles: [], failedFiles: [] } as ContentFileUploadOutcome,
  uploadError: undefined as Error | undefined,
  deleteErrorIds: new Set<string>(),
  downloadErrorIds: new Set<string>(),
  previewError: undefined as Error | undefined,
  uploadCalls: [] as File[][],
  deleteCalls: [] as string[],
  downloadCalls: [] as string[],
  previewCalls: [] as string[],
}))

vi.mock('vue-sonner', () => ({ toast: toastMocks }))

vi.mock('@/features/content-admin/composables/useFileManagement', async () => {
  const { shallowRef } = await import('vue')
  return {
    useFileManagement: (filters: Ref<ContentFileListFilters>) => {
      filePanelState.filters = filters
      const total = shallowRef(filePanelState.total)
      const queryError = shallowRef(filePanelState.queryError)
      filePanelState.totalRef = total
      filePanelState.queryErrorRef = queryError
      return {
        files: shallowRef(filePanelState.files),
        total,
        queryError,
        isLoading: shallowRef(false),
        isUploading: shallowRef(false),
        isDeleting: shallowRef(false),
        uploadFiles: async (files: File[]) => {
          filePanelState.uploadCalls.push(files)
          if (filePanelState.uploadError) throw filePanelState.uploadError
          return filePanelState.uploadOutcome
        },
        deleteFile: async (file: ContentFileRecord) => {
          filePanelState.deleteCalls.push(file.id)
          if (filePanelState.deleteErrorIds.has(file.id)) throw new Error(`delete ${file.id}`)
        },
        downloadFile: async (file: ContentFileRecord) => {
          filePanelState.downloadCalls.push(file.id)
          if (filePanelState.downloadErrorIds.has(file.id)) throw new Error(`download ${file.id}`)
          return { blob: new Blob(['file']), fileName: file.name }
        },
      }
    },
  }
})

vi.mock('@/features/uploads/composables/useUploadPolicy', async () => {
  const { shallowRef } = await import('vue')
  return {
    useUploadPolicy: () => ({
      policy: shallowRef(filePanelState.policy),
      queryError: shallowRef(filePanelState.policyError),
      isLoading: shallowRef(filePanelState.isPolicyLoading),
      refresh: async () => ({ data: filePanelState.policy, error: filePanelState.policyError }),
    }),
  }
})

vi.mock('@/lib/http', async (importOriginal) => {
  const http = await importOriginal<typeof import('@/lib/http')>()
  return {
    ...http,
    download: async (url: string) => {
      filePanelState.previewCalls.push(url)
      if (filePanelState.previewError) throw filePanelState.previewError
      return { blob: new Blob(['preview']), fileName: 'preview' }
    },
  }
})

const contentFiles: ContentFileRecord[] = [
  {
    id: 'file-image',
    name: 'release-image.png',
    mimeType: 'image/png',
    size: 2048,
    uploadedBy: 'Admin',
    uploadedAt: '2026-08-11T08:00:00.000Z',
    previewUrl: '/api/content-files/file-image/preview',
  },
  {
    id: 'file-report',
    name: 'quarterly-report.pdf',
    mimeType: 'application/pdf',
    size: 4096,
    uploadedBy: 'Editor',
    uploadedAt: '2026-08-10T08:00:00.000Z',
  },
]

const ConfirmActionStub = defineComponent({
  name: 'ConfirmAction',
  emits: ['confirm'],
  template:
    '<div><slot name="trigger" /><button type="button" data-testid="confirm-delete" @click="$emit(\'confirm\')">Confirm delete</button></div>',
})

const DialogStub = defineComponent({
  name: 'Dialog',
  props: { open: Boolean, title: String },
  template: '<div v-if="open" data-testid="preview-dialog">{{ title }}<slot /></div>',
})

function mountFilePanel(
  props: { canUpload: boolean; canDelete: boolean },
  shouldStubActions = false,
) {
  return mount(FilePanel, {
    props,
    global: {
      plugins: [i18n],
      stubs: shouldStubActions
        ? { ConfirmAction: ConfirmActionStub, Dialog: DialogStub }
        : undefined,
    },
  })
}

function selectUploadEntries(
  wrapper: ReturnType<typeof mountFilePanel>,
  entries: FileUploadEntry[],
) {
  wrapper.findComponent(Upload).vm.$emit('update:modelValue', entries)
  return nextTick()
}

function getUploadButton(wrapper: ReturnType<typeof mountFilePanel>) {
  return wrapper.findAll('button').find((button) => button.text().includes('Upload selected'))!
}

beforeEach(() => {
  filePanelState.filters = undefined
  filePanelState.files = [...contentFiles]
  filePanelState.total = 25
  filePanelState.totalRef = undefined
  filePanelState.queryError = null
  filePanelState.queryErrorRef = undefined
  filePanelState.policy = undefined
  filePanelState.policyError = null
  filePanelState.isPolicyLoading = false
  filePanelState.uploadOutcome = { uploadedFiles: [], failedFiles: [] }
  filePanelState.uploadError = undefined
  filePanelState.deleteErrorIds.clear()
  filePanelState.downloadErrorIds.clear()
  filePanelState.previewError = undefined
  filePanelState.uploadCalls = []
  filePanelState.deleteCalls = []
  filePanelState.downloadCalls = []
  filePanelState.previewCalls = []
  vi.clearAllMocks()
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:file-preview'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  setLocale('en-US')
})

describe('content file list composition', () => {
  it('uses submitted filters and adapts one-based server pagination to ProTable', async () => {
    const wrapper = mountFilePanel({ canUpload: false, canDelete: false })

    wrapper.get('[data-testid="pro-table"]')
    expect(wrapper.text()).toContain('25 files')
    expect(wrapper.text()).toContain('Page 1 of 3')
    expect(filePanelState.filters?.value).toEqual({ keyword: '', page: 1, pageSize: 10 })

    await wrapper.get('input[type="search"]').setValue('report')
    expect(filePanelState.filters?.value).toEqual({ keyword: '', page: 1, pageSize: 10 })

    await wrapper.get('form').trigger('submit')
    expect(filePanelState.filters?.value).toEqual({ keyword: 'report', page: 1, pageSize: 10 })

    await wrapper.get('button[aria-label="Next page"]').trigger('click')
    expect(filePanelState.filters?.value).toEqual({ keyword: 'report', page: 2, pageSize: 10 })

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Reset')!
      .trigger('click')
    expect(filePanelState.filters?.value).toEqual({ keyword: '', page: 1, pageSize: 10 })
    expect(wrapper.findAll('button[aria-label="Download file"]')).toHaveLength(2)
    expect(wrapper.findAll('button[aria-label="Preview image"]')).toHaveLength(1)
    expect(wrapper.find('button[aria-label="Delete"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('keeps the requested server page when a failed response has no authoritative total', async () => {
    const wrapper = mountFilePanel({ canUpload: false, canDelete: false })

    await wrapper.get('button[aria-label="Next page"]').trigger('click')
    await wrapper.get('button[aria-label="Next page"]').trigger('click')
    expect(filePanelState.filters?.value.page).toBe(3)

    filePanelState.totalRef!.value = 0
    filePanelState.queryErrorRef!.value = new Error('page unavailable')
    await nextTick()

    expect(filePanelState.filters?.value.page).toBe(3)
    expect(wrapper.text()).toContain('Page 3 of 3')
    expect(wrapper.text()).toContain('Network connection failed')

    await wrapper.get('button[aria-label="Previous page"]').trigger('click')
    expect(filePanelState.filters?.value.page).toBe(2)
    expect(wrapper.text()).toContain('Page 2 of 2')

    filePanelState.queryErrorRef!.value = null
    await nextTick()

    expect(filePanelState.filters?.value.page).toBe(1)
    expect(wrapper.text()).toContain('Page 1 of 1')
    wrapper.unmount()
  })

  it('projects download, preview, delete success, and row-action failures', async () => {
    filePanelState.total = contentFiles.length
    filePanelState.deleteErrorIds.add('file-report')
    filePanelState.downloadErrorIds.add('file-report')
    const wrapper = mountFilePanel({ canUpload: false, canDelete: true }, true)

    const downloadButtons = wrapper.findAll('button[aria-label="Download file"]')
    await downloadButtons[0]!.trigger('click')
    await downloadButtons[1]!.trigger('click')
    await flushPromises()
    expect(filePanelState.downloadCalls).toEqual(['file-image', 'file-report'])
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1)
    expect(toastMocks.error).toHaveBeenCalledWith('Network connection failed')

    await wrapper.get('button[aria-label="Preview image"]').trigger('click')
    await flushPromises()
    expect(filePanelState.previewCalls).toEqual(['/content-files/file-image/preview'])
    expect(wrapper.get('[data-testid="preview-dialog"]').text()).toContain('release-image.png')

    const confirmButtons = wrapper.findAll('[data-testid="confirm-delete"]')
    await confirmButtons[0]!.trigger('click')
    await confirmButtons[1]!.trigger('click')
    await flushPromises()
    expect(filePanelState.deleteCalls).toEqual(['file-image', 'file-report'])
    expect(toastMocks.success).toHaveBeenCalledWith('File deleted')
    expect(toastMocks.error).toHaveBeenCalledWith('Network connection failed')

    filePanelState.previewError = new Error('preview failed')
    await wrapper.get('button[aria-label="Preview image"]').trigger('click')
    await flushPromises()
    expect(toastMocks.error).toHaveBeenCalledWith('Network connection failed')

    wrapper.unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('enforces upload policy, reports rejections, and preserves retry candidates', async () => {
    filePanelState.policy = {
      maxFileSizeBytes: 5 * 1024 * 1024,
      allowedExtensions: ['png', 'txt'],
      updatedAt: '2026-08-11T00:00:00.000Z',
    }
    const wrapper = mountFilePanel({ canUpload: true, canDelete: false })
    const upload = wrapper.findComponent(Upload)
    const validFile = new File(['image'], 'release.png', { type: 'image/png' })
    const retryFile = new File(['notes'], 'notes.txt', { type: 'text/plain' })
    const invalidFile = new File(['script'], 'payload.js', { type: 'application/javascript' })

    upload.vm.$emit('rejected', [{ file: validFile, reason: 'file-too-large' }])
    upload.vm.$emit('rejected', [{ file: invalidFile, reason: 'invalid-type' }])
    upload.vm.$emit('rejected', [{ file: validFile, reason: 'duplicate' }])
    expect(toastMocks.error).toHaveBeenCalledTimes(3)

    await selectUploadEntries(wrapper, [{ id: 'invalid', file: invalidFile }])
    await getUploadButton(wrapper).trigger('click')
    expect(filePanelState.uploadCalls).toHaveLength(0)
    expect(toastMocks.error).toHaveBeenCalledWith(
      'The upload policy changed. Selected files that no longer comply were removed.',
    )

    filePanelState.uploadOutcome = {
      uploadedFiles: [contentFiles[0]!],
      failedFiles: [retryFile],
    }
    await selectUploadEntries(wrapper, [
      { id: 'valid', file: validFile },
      { id: 'retry', file: retryFile },
    ])
    await getUploadButton(wrapper).trigger('click')
    await flushPromises()
    expect(filePanelState.uploadCalls[0]).toEqual([validFile, retryFile])
    expect(toastMocks.warning).toHaveBeenCalledWith(
      '1 file(s) uploaded; 1 failed and remain selected.',
    )

    filePanelState.uploadOutcome = {
      uploadedFiles: [contentFiles[0]!],
      failedFiles: [],
    }
    await selectUploadEntries(wrapper, [{ id: 'valid', file: validFile }])
    await getUploadButton(wrapper).trigger('click')
    await flushPromises()
    expect(toastMocks.success).toHaveBeenCalledWith('Files uploaded')

    filePanelState.uploadOutcome = {
      uploadedFiles: [],
      failedFiles: [retryFile],
      firstFailure: new Error('all uploads failed'),
    }
    await selectUploadEntries(wrapper, [{ id: 'retry', file: retryFile }])
    await getUploadButton(wrapper).trigger('click')
    await flushPromises()
    expect(toastMocks.error).toHaveBeenCalledWith('Network connection failed')

    filePanelState.uploadError = new Error('upload unavailable')
    await selectUploadEntries(wrapper, [{ id: 'valid', file: validFile }])
    await getUploadButton(wrapper).trigger('click')
    await flushPromises()
    expect(toastMocks.error).toHaveBeenCalledWith('Network connection failed')

    wrapper.unmount()
  })

  it('renders safe disabled descriptions for loading, error, and empty upload policies', () => {
    filePanelState.isPolicyLoading = true
    const loadingWrapper = mountFilePanel({ canUpload: true, canDelete: false })
    expect(loadingWrapper.text()).toContain('Loading the current upload policy')
    loadingWrapper.unmount()

    filePanelState.isPolicyLoading = false
    filePanelState.policyError = new Error('policy unavailable')
    const errorWrapper = mountFilePanel({ canUpload: true, canDelete: false })
    expect(errorWrapper.text()).toContain('The upload policy is unavailable')
    expect(errorWrapper.text()).toContain('Network connection failed')
    errorWrapper.unmount()

    filePanelState.policyError = null
    filePanelState.policy = {
      maxFileSizeBytes: 1024,
      allowedExtensions: [],
      updatedAt: '2026-08-11T00:00:00.000Z',
    }
    const emptyWrapper = mountFilePanel({ canUpload: true, canDelete: false })
    expect(emptyWrapper.text()).toContain('permits no content-file formats')
    emptyWrapper.unmount()
  })
})
