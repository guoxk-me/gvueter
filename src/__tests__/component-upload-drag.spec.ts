import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import ImageCropper from '@/components/admin/ImageCropper.vue'
import AccessibleDragBoard from '@/features/component-gallery/operations/components/AccessibleDragBoard.vue'
import UploadLifecycleDemo from '@/features/component-gallery/operations/components/UploadLifecycleDemo.vue'
import UploadMediaDemo from '@/features/component-gallery/operations/components/UploadMediaDemo.vue'
import {
  createDemoUploadTask,
  DEMO_UPLOAD_CHUNK_SIZE,
} from '@/features/component-gallery/operations/upload-lifecycle'
import { i18n, setLocale } from '@/i18n'
import { generateMockToken } from '@/mocks/data/users'

enableAutoUnmount(afterEach)

describe('upload lifecycle and accessible drag examples', () => {
  beforeEach(() => {
    // AI modified: the upload demo exercises the same authenticated API boundary as its production host.
    sessionStorage.setItem('auth_token', generateMockToken(1))
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('creates a waiting upload task with a truthful chunk boundary', () => {
    const file = new File([new Uint8Array(DEMO_UPLOAD_CHUNK_SIZE + 1)], 'report.csv', {
      type: 'text/csv',
    })
    const task = createDemoUploadTask(file)

    expect(task).toMatchObject({
      file,
      status: 'waiting',
      completedChunks: 0,
      totalChunks: 2,
      progress: 0,
    })
  })

  it('reorders within a list and moves across containers with visible controls', async () => {
    setLocale('en-US')
    const wrapper = mount(AccessibleDragBoard, { global: { plugins: [i18n] } })
    const backlog = wrapper.get('[data-board-lane="backlog"]')
    const firstCard = backlog.get('[data-board-card="card-access-review"]')

    await firstCard.get('button[aria-label^="Move down"]').trigger('click')
    expect(
      backlog.findAll('[data-board-card]').map(card => card.attributes('data-board-card')),
    ).toEqual(['card-copy-audit', 'card-access-review', 'card-export-policy'])

    await firstCard.get('button[aria-label^="Move to next lane"]').trigger('click')
    expect(
      wrapper
        .find('[data-board-lane="in-progress"] [data-board-card="card-access-review"]')
        .exists(),
    ).toBe(true)
    expect(wrapper.get('[role="status"]').text()).toContain(
      'Moved Review access request to In progress',
    )
  })

  it('supports the documented Alt+Arrow keyboard alternative', async () => {
    setLocale('en-US')
    const wrapper = mount(AccessibleDragBoard, { global: { plugins: [i18n] } })
    const card = wrapper.get('[data-board-card="card-access-review"]')

    await card.trigger('keydown', { altKey: true, key: 'ArrowRight' })
    expect(
      wrapper.find('[data-board-lane="backlog"] [data-board-card="card-access-review"]').exists(),
    ).toBe(false)
    expect(
      wrapper
        .find('[data-board-lane="in-progress"] [data-board-card="card-access-review"]')
        .exists(),
    ).toBe(true)
  })

  it('supports pointer drag across containers', async () => {
    setLocale('en-US')
    const wrapper = mount(AccessibleDragBoard, { global: { plugins: [i18n] } })
    const card = wrapper.get('[data-board-card="card-access-review"]')
    const transfer = { effectAllowed: '', setData: vi.fn() }

    await card.trigger('dragstart', { dataTransfer: transfer })
    await wrapper.get('[data-board-lane="done"]').trigger('drop')

    expect(transfer.setData).toHaveBeenCalledWith('text/plain', 'card-access-review')
    expect(
      wrapper.find('[data-board-lane="done"] [data-board-card="card-access-review"]').exists(),
    ).toBe(true)
  })

  it('reports partial success, retries the failed chunk, and fills server results', async () => {
    setLocale('en-US')
    const wrapper = mount(UploadLifecycleDemo, { global: { plugins: [i18n] } })

    const addScenarioButton = wrapper
      .findAll('button')
      .find(button => button.text().includes('Add partial-success scenario'))
    expect(addScenarioButton).toBeDefined()
    await addScenarioButton!.trigger('click')
    const startButton = wrapper
      .findAll('button')
      .find(button => button.text().includes('Start waiting uploads'))
    expect(startButton).toBeDefined()
    await startButton!.trigger('click')

    const firstTask = wrapper.findAll('[data-upload-status="uploading"]')[0]
    expect(firstTask).toBeDefined()
    const pauseButton = firstTask!
      .findAll('button')
      .find(button => button.text().includes('Pause'))
    expect(pauseButton).toBeDefined()
    await pauseButton!.trigger('click')
    expect(firstTask!.attributes('data-upload-status')).toBe('paused')
    const resumeButton = firstTask!
      .findAll('button')
      .find(button => button.text().includes('Resume'))
    expect(resumeButton).toBeDefined()
    await resumeButton!.trigger('click')

    await vi.waitFor(
      () => {
        const hasIntermediateProgress = wrapper.findAll('[role="progressbar"]').some((progress) => {
          const currentProgress = Number(progress.attributes('aria-valuenow'))
          return currentProgress > 0 && currentProgress < 100
        })
        expect(hasIntermediateProgress).toBe(true)
      },
      { timeout: 2_000, interval: 20 },
    )

    await vi.waitFor(
      async () => {
        await flushPromises()
        expect(wrapper.findAll('[data-upload-status="succeeded"]')).toHaveLength(2)
        expect(wrapper.findAll('[data-upload-status="failed"]')).toHaveLength(1)
      },
      { timeout: 5_000 },
    )

    const failedTask = wrapper.get('[data-upload-status="failed"]')
    expect(failedTask.get('[role="alert"]').text()).toContain('rejected this chunk once')
    await failedTask.get('button').trigger('click')

    await vi.waitFor(
      async () => {
        await flushPromises()
        await nextTick()
        expect(wrapper.findAll('[data-upload-status="succeeded"]')).toHaveLength(3)
      },
      { timeout: 5_000 },
    )
    expect(
      wrapper
        .findAll('[role="progressbar"]')
        .every(progress => progress.attributes('aria-valuenow') === '100'),
    ).toBe(true)
    expect(wrapper.text()).toContain('demo-file-')
    expect(wrapper.text()).toContain('/api/component-gallery/files/')
  })

  it('rejects anonymous chunks and serves completed bytes only to authenticated callers', async () => {
    const uploadId = 'download-contract'
    const uploadPath = `/api/component-gallery/uploads/${uploadId}/chunks/0`
    sessionStorage.clear()

    const anonymousResponse = await fetch(uploadPath, {
      method: 'POST',
      body: new Uint8Array([1, 2, 3]),
      headers: {
        'X-Demo-File-Name': encodeURIComponent('receipt.csv'),
        'X-Demo-Total-Chunks': '1',
      },
    })
    expect(anonymousResponse.status).toBe(401)

    const token = generateMockToken(1)
    sessionStorage.setItem('auth_token', token)
    const authorization = { Authorization: `Bearer ${token}` }
    const acceptedResponse = await fetch(uploadPath, {
      method: 'POST',
      body: new Uint8Array([1, 2, 3]),
      headers: {
        ...authorization,
        'Content-Type': 'application/octet-stream',
        'X-Demo-File-Name': encodeURIComponent('receipt.csv'),
        'X-Demo-Total-Chunks': '1',
      },
    })
    expect(acceptedResponse.status).toBe(200)

    const completionResponse = await fetch(`/api/component-gallery/uploads/${uploadId}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        fileName: 'receipt.csv',
        mimeType: 'text/csv',
        totalChunks: 1,
      }),
      headers: { ...authorization, 'Content-Type': 'application/json' },
    })
    const completionBody = (await completionResponse.json()) as {
      data: { resultUrl: string }
    }
    const anonymousDownload = await fetch(completionBody.data.resultUrl)
    expect(anonymousDownload.status).toBe(401)

    const authenticatedDownload = await fetch(completionBody.data.resultUrl, {
      headers: authorization,
    })
    expect(authenticatedDownload.status).toBe(200)
    expect(authenticatedDownload.headers.get('Content-Disposition')).toContain(
      'filename*=UTF-8\'\'receipt.csv',
    )
    expect(new Uint8Array(await authenticatedDownload.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    )
  })

  it('keeps upload rejection details visible for long English file names', async () => {
    setLocale('en-US')
    const longFileName = `${'quarterly-access-report-'.repeat(10)}.csv`
    const FileUploadStub = defineComponent({
      emits: ['rejected'],
      setup(_props, { emit }) {
        const rejectFile = () =>
          emit('rejected', [
            {
              file: new File(['unsafe'], longFileName, { type: 'text/csv' }),
              reason: 'invalid-file-name',
            },
          ])
        return { rejectFile }
      },
      template: '<button type="button" data-reject-file @click="rejectFile">Reject file</button>',
    })
    const wrapper = mount(UploadLifecycleDemo, {
      global: { plugins: [i18n], stubs: { FileUpload: FileUploadStub } },
    })

    await wrapper.get('[data-reject-file]').trigger('click')

    const alert = wrapper.get('[role="alert"]')
    expect(alert.text()).toContain('Some files were not added')
    expect(alert.text()).toContain('unsafe names')
    expect(alert.get('li').attributes('title')).toBe(longFileName)
  })

  it('separates single/multiple image selection and recovers a failed crop source', async () => {
    setLocale('en-US')
    const ImageUploadStub = defineComponent({
      inheritAttrs: false,
      props: {
        modelValue: { type: Array, default: () => [] },
        multiple: { type: Boolean, default: true },
        maxFiles: { type: Number, default: 5 },
      },
      emits: ['update:modelValue'],
      setup(_props, { emit }) {
        const selectImage = () =>
          emit('update:modelValue', [
            {
              id: 'image-1',
              file: new File(['image'], 'avatar.png', { type: 'image/png' }),
            },
          ])
        return { selectImage }
      },
      template:
        '<button type="button" data-image-upload :data-count="String(modelValue.length)" :data-multiple="String(multiple)" :data-max-files="String(maxFiles)" @click="selectImage" />',
    })
    const ImageCropperStub = defineComponent({
      inheritAttrs: false,
      props: { src: { type: String, required: true } },
      template: '<div data-image-cropper :data-src="src" />',
    })
    const ConfirmActionStub = defineComponent({
      emits: ['confirm'],
      template:
        '<button type="button" data-confirm-clear @click="$emit(\'confirm\')">Confirm clear</button>',
    })
    const wrapper = mount(UploadMediaDemo, {
      global: {
        plugins: [i18n],
        stubs: {
          ImageUpload: ImageUploadStub,
          ImageCropper: ImageCropperStub,
          ConfirmAction: ConfirmActionStub,
        },
      },
    })

    const imageUploads = wrapper.findAll('[data-image-upload]')
    expect(imageUploads).toHaveLength(2)
    expect(imageUploads[0]?.attributes()).toMatchObject({
      'data-multiple': 'false',
      'data-max-files': '1',
    })
    expect(imageUploads[1]?.attributes()).toMatchObject({
      'data-multiple': 'true',
      'data-max-files': '4',
    })

    await imageUploads[0]!.trigger('click')
    expect(wrapper.findAll('[data-image-upload]')[0]?.attributes('data-count')).toBe('1')
    await wrapper.get('[data-confirm-clear]').trigger('click')
    expect(wrapper.findAll('[data-image-upload]')[0]?.attributes('data-count')).toBe('0')

    const simulateFailure = wrapper
      .findAll('button')
      .find(button => button.text() === 'Simulate load failure')
    expect(simulateFailure).toBeDefined()
    await simulateFailure!.trigger('click')
    expect(wrapper.get('[data-image-cropper]').attributes('data-src')).toBe(
      '/missing-gallery-image.png',
    )
    const restoreSample = wrapper
      .findAll('button')
      .find(button => button.text() === 'Restore sample')
    await restoreSample!.trigger('click')
    expect(wrapper.get('[data-image-cropper]').attributes('data-src')).toContain(
      'data:image/svg+xml',
    )
  })

  it('clears an image load error only after the recovery source loads', async () => {
    setLocale('en-US')
    const wrapper = mount(ImageCropper, {
      props: { src: '/missing-gallery-image.png' },
      global: { plugins: [i18n] },
    })

    await wrapper.get('img').trigger('error')
    expect(wrapper.get('[role="alert"]').text()).toBe('The image could not be loaded.')

    await wrapper.setProps({ src: '/recovered-gallery-image.png' })
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    await wrapper.get('img').trigger('load')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})
