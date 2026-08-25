import type {
  FormWorkbenchSubmitInput,
  FormWorkbenchValues,
  TitleAvailabilityResponse,
} from '@/features/form-workbench/types'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { HttpResponse, http as mswHttp } from 'msw'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { DateTimePicker } from '@/components/admin'
import FormWorkbench from '@/features/form-workbench/components/FormWorkbench.vue'
import WorkbenchBasicFields from '@/features/form-workbench/components/WorkbenchBasicFields.vue'
import WorkbenchContentFields from '@/features/form-workbench/components/WorkbenchContentFields.vue'
import {
  FORM_WORKBENCH_DRAFT_DEBOUNCE_MS,
  FORM_WORKBENCH_DRAFT_KEY,
  getFormWorkbenchDraft,
  getFormWorkbenchDraftKey,
  readFormWorkbenchDraft,
  useFormWorkbenchDraft,
} from '@/features/form-workbench/composables/useFormWorkbenchDraft'
import {
  getFormWorkbenchFingerprint,
  getLinkedBudget,
  getValidWorkbenchCity,
  getWorkbenchCities,
  getWorkbenchSubmission,
  shouldConfirmWorkbenchLeave,
} from '@/features/form-workbench/form-workbench-rules'
import {
  getFormWorkbenchSchema,
  hasRichTextContent,
} from '@/features/form-workbench/form-workbench-schema'
import { FORM_WORKBENCH_FIELDS } from '@/features/form-workbench/types'
import { i18n, setLocale } from '@/i18n'
import { updateAbility } from '@/lib/ability'
import { get, post } from '@/lib/http'
import { generateMockToken, mockUsers } from '@/mocks/data/users'
import { resetMockFormWorkbench } from '@/mocks/handlers/form-workbench'
import { server } from '@/mocks/node'
import { useAuthStore } from '@/stores/auth'
import { getTestAuthorization, getTestPrincipal } from './auth-test-helpers'

enableAutoUnmount(afterEach)

const validSubmission: FormWorkbenchSubmitInput = {
  title: 'July customer onboarding',
  budget: 1_500,
  category: 'customer',
  reviewers: ['operations'],
  province: 'zhejiang',
  city: 'hangzhou',
  publishAt: '2026-07-20T09:30',
  activeRange: { start: '2026-07-20', end: '2026-08-20' },
  richContent: '<p>Coordinate the customer onboarding workflow.</p>',
  markdown: '## Acceptance criteria',
  address: 'No. 1 West Lake Road, Hangzhou',
  attachmentNames: ['brief.pdf'],
  imageNames: ['reference.webp'],
}
const adminPrincipalId = '1'
const editorPrincipalId = '2'

class MemoryStorage implements Storage {
  readonly records = new Map<string, string>()

  get length(): number {
    return this.records.size
  }

  clear(): void {
    this.records.clear()
  }

  getItem(key: string): string | null {
    return this.records.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.records.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.records.delete(key)
  }

  setItem(key: string, value: string): void {
    this.records.set(key, value)
  }
}

describe('form workbench rules', () => {
  it('exposes schema-driven basic controls and linked cascade behavior', () => {
    expect(FORM_WORKBENCH_FIELDS.map(field => field.name)).toEqual([
      'title',
      'budget',
      'category',
    ])
    expect(getLinkedBudget('internal', 500)).toBe(0)
    expect(getLinkedBudget('customer', 500)).toBe(500)
    expect(getWorkbenchCities('zhejiang')).toEqual(['hangzhou', 'ningbo'])
    expect(getValidWorkbenchCity('jiangsu', 'hangzhou')).toBe('')
    expect(getValidWorkbenchCity('jiangsu', 'suzhou')).toBe('suzhou')
  })

  it('validates synchronous content and category-linked reviewer rules with Zod', () => {
    const schema = getFormWorkbenchSchema(key => key)
    const validValues = schema.safeParse(validSubmission)
    expect(validValues.success).toBe(true)
    expect(hasRichTextContent('<p><br></p>')).toBe(false)

    const invalidValues = schema.safeParse({
      ...validSubmission,
      reviewers: [],
      richContent: '<p><br></p>',
    })
    expect(invalidValues.success).toBe(false)
    if (!invalidValues.success) {
      expect(invalidValues.error.issues.map(issue => issue.path[0])).toEqual(
        expect.arrayContaining(['reviewers', 'richContent']),
      )
    }
  })

  it('copies submission arrays and detects unsaved route-leave state', () => {
    const submission = getWorkbenchSubmission(validSubmission, ['brief.pdf'], ['reference.webp'])
    const committedFingerprint = getFormWorkbenchFingerprint(submission)
    expect(shouldConfirmWorkbenchLeave(committedFingerprint, committedFingerprint, false)).toBe(
      false,
    )

    const changedFingerprint = getFormWorkbenchFingerprint({
      ...submission,
      title: 'Changed title',
    })
    expect(shouldConfirmWorkbenchLeave(changedFingerprint, committedFingerprint, false)).toBe(true)
    expect(shouldConfirmWorkbenchLeave(changedFingerprint, committedFingerprint, true)).toBe(false)
  })

  it('round-trips only the current principal draft and rejects malformed storage', () => {
    const storage = new MemoryStorage()
    const draft = getFormWorkbenchDraft(
      validSubmission,
      adminPrincipalId,
      '2026-07-13T08:00:00.000Z',
    )
    const adminDraftKey = getFormWorkbenchDraftKey(adminPrincipalId)
    storage.setItem(adminDraftKey, JSON.stringify(draft))
    expect(readFormWorkbenchDraft(storage, adminPrincipalId)).toEqual(draft)
    expect(readFormWorkbenchDraft(storage, editorPrincipalId)).toBeUndefined()

    storage.setItem(
      adminDraftKey,
      JSON.stringify({
        ...draft,
        version: 1,
        schemaId: undefined,
        principalId: undefined,
      }),
    )
    expect(readFormWorkbenchDraft(storage, adminPrincipalId)).toEqual(draft)

    storage.setItem(adminDraftKey, JSON.stringify({ ...draft, values: { title: 42 } }))
    expect(readFormWorkbenchDraft(storage, adminPrincipalId)).toBeUndefined()

    storage.setItem(FORM_WORKBENCH_DRAFT_KEY, JSON.stringify(draft))
    const draftSession = useFormWorkbenchDraft({ principalId: adminPrincipalId, storage })
    expect(storage.getItem(FORM_WORKBENCH_DRAFT_KEY)).toBeNull()
    draftSession.saveDraft(validSubmission)
    expect(storage.getItem(adminDraftKey)).not.toBeNull()
    draftSession.clearDraft()
    expect(storage.getItem(adminDraftKey)).toBeNull()
    expect(FORM_WORKBENCH_DRAFT_DEBOUNCE_MS).toBe(800)
  })

  it('keeps draft actions in memory when session storage is blocked or full', () => {
    const unavailableStorage = {
      getItem(): string | null {
        throw new DOMException('Storage access denied', 'SecurityError')
      },
      setItem(): void {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError')
      },
      removeItem(): void {
        throw new DOMException('Storage access denied', 'SecurityError')
      },
    } satisfies Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>

    expect(readFormWorkbenchDraft(unavailableStorage, adminPrincipalId)).toBeUndefined()
    const draftSession = useFormWorkbenchDraft({
      principalId: adminPrincipalId,
      storage: unavailableStorage,
    })

    expect(() => draftSession.saveDraft(validSubmission)).not.toThrow()
    expect(draftSession.restoredDraft.value).toMatchObject({
      principalId: adminPrincipalId,
      values: { title: validSubmission.title },
    })
    expect(() => draftSession.clearDraft()).not.toThrow()
    expect(draftSession.restoredDraft.value).toBeUndefined()
  })
})

describe('form workbench basic-field accessibility', () => {
  it('keeps errors and live field statuses attached through stable message identifiers', async () => {
    setLocale('en-US')
    const values: FormWorkbenchValues = validSubmission
    const wrapper = mount(WorkbenchBasicFields, {
      props: {
        values: { ...values, category: 'internal' },
        errors: {},
        isDisabled: false,
        isCheckingTitle: false,
        titleAvailability: 'available',
      },
      global: { plugins: [i18n] },
    })

    // AI modified: every basic control resolves its description to an existing, stable message node.
    const describedControls = [
      ['#workbench-title', 'workbench-title-message'],
      ['#workbench-budget', 'workbench-budget-message'],
      ['#workbench-category', 'workbench-category-message'],
      ['#workbench-province', 'workbench-province-message'],
      ['#workbench-city', 'workbench-city-message'],
      ['#workbench-publish-at', 'workbench-publish-at-message'],
      ['#workbench-address', 'workbench-address-message'],
    ] as const
    for (const [controlSelector, messageId] of describedControls) {
      expect(wrapper.get(controlSelector).attributes('aria-describedby')).toBe(messageId)
      expect(wrapper.get(`#${messageId}`).attributes('id')).toBe(messageId)
    }
    expect(wrapper.get('#workbench-title-message').text()).toBe('This title is available.')
    expect(wrapper.get('#workbench-budget-message').text()).toContain('budget is fixed at zero')
    expect(wrapper.get('fieldset').attributes('aria-describedby')).toBe(
      'workbench-reviewers-message',
    )
    expect(wrapper.get('fieldset [role="checkbox"]').attributes('aria-describedby')).toBe(
      'workbench-reviewers-message',
    )

    await wrapper.setProps({
      errors: {
        title: 'Title is required.',
        reviewers: 'Select a reviewer.',
        province: 'Select a province.',
      },
    })
    expect(wrapper.get('#workbench-title-message').attributes('role')).toBe('alert')
    expect(wrapper.get('#workbench-title-message').text()).toBe('Title is required.')
    expect(wrapper.get('#workbench-reviewers-message').attributes('role')).toBe('alert')
    expect(wrapper.get('#workbench-province-message').attributes('role')).toBe('alert')
    expect(
      wrapper
        .get('#workbench-title')
        .element
        .closest('[data-slot="field"]')
        ?.getAttribute('data-invalid'),
    ).toBe('true')
  })

  it('commits the calendar date and time together while forwarding form and error attributes', async () => {
    const wrapper = mount(DateTimePicker, {
      attachTo: document.body,
      props: {
        id: 'publish-at-picker',
        name: 'publishAt',
        label: 'Publish date and time',
        timeLabel: 'Publish time',
        modelValue: '2026-07-20T09:30',
        applyLabel: 'Confirm',
        clearLabel: 'Reset',
        ariaInvalid: true,
        ariaDescribedby: 'publish-at-error',
      },
      global: { plugins: [i18n] },
    })

    const trigger = wrapper.get('#publish-at-picker')
    expect(trigger.attributes()).toMatchObject({
      'aria-invalid': 'true',
      'aria-describedby': 'publish-at-error',
      'aria-label': 'Publish date and time',
    })
    expect(wrapper.get('input[type="hidden"]').attributes()).toMatchObject({
      name: 'publishAt',
      value: '2026-07-20T09:30',
    })

    await trigger.trigger('click')
    await flushPromises()
    const timeInput = document.body.querySelector<HTMLInputElement>('#publish-at-picker-time')
    expect(timeInput).not.toBeNull()
    timeInput!.value = '10:45'
    timeInput!.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    const confirmButton = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(
      button => button.textContent?.trim() === 'Confirm',
    )
    expect(confirmButton?.disabled).toBe(false)
    confirmButton?.click()
    await flushPromises()
    const appliedValues = wrapper.emitted('update:modelValue') ?? []
    expect(appliedValues[appliedValues.length - 1]?.[0]).toBe('2026-07-20T10:45')

    await trigger.trigger('click')
    await flushPromises()
    const resetButton = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(
      button => button.textContent?.trim() === 'Reset',
    )
    resetButton?.click()
    await flushPromises()
    const clearedValues = wrapper.emitted('update:modelValue') ?? []
    expect(clearedValues[clearedValues.length - 1]?.[0]).toBe('')
  })

  it('associates content-step errors with the active-range group and Markdown control', () => {
    const wrapper = mount(WorkbenchContentFields, {
      props: {
        errors: {
          activeRange: 'Select an active range.',
          markdown: 'Enter Markdown notes.',
        },
        isDisabled: false,
        restoredAttachmentNames: [],
        restoredImageNames: [],
      },
      global: {
        plugins: [i18n],
        stubs: {
          DateRangePicker: true,
          FileUpload: true,
          RichTextEditor: true,
        },
      },
    })

    const activeRangeGroup = wrapper.get('[aria-labelledby="workbench-active-range-label"]')
    expect(activeRangeGroup.attributes()).toMatchObject({
      'aria-describedby': 'workbench-active-range-message',
      'data-invalid': 'true',
    })
    expect(wrapper.get('#workbench-active-range-message').attributes('role')).toBe('alert')
    expect(wrapper.get('#workbench-markdown').attributes()).toMatchObject({
      'name': 'markdown',
      'autocomplete': 'off',
      'aria-invalid': 'true',
      'aria-describedby': 'workbench-markdown-message',
    })
    expect(wrapper.get('#workbench-markdown-message').attributes('role')).toBe('alert')
  })
})

describe('form workbench browser behavior', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    const adminUser = mockUsers[0] ?? null
    updateAbility(adminUser, adminUser ? getTestAuthorization(adminUser) : null)
    setLocale('en-US')
  })

  afterEach(() => {
    vi.useRealTimers()
    updateAbility(null)
    localStorage.clear()
    sessionStorage.clear()
  })

  it('auto-saves after 800ms and blocks navigation while the restored edit is dirty', async () => {
    const { attachmentNames, imageNames, ...legacyValues } = validSubmission
    sessionStorage.setItem(
      getFormWorkbenchDraftKey(adminPrincipalId),
      JSON.stringify({
        version: 1,
        savedAt: '2026-07-13T08:00:00.000Z',
        values: legacyValues,
        attachmentNames,
        imageNames,
      }),
    )
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/workbench', component: FormWorkbench },
        { path: '/other', component: { template: '<p>Other route</p>' } },
      ],
    })
    await router.push('/workbench')
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const pinia = createPinia()
    const authStore = useAuthStore(pinia)
    const { password: _password, ...admin } = mockUsers[0]!
    authStore.setToken(generateMockToken(admin.id))
    authStore.setAuthenticatedPrincipal(getTestPrincipal(admin))
    const wrapper = mount(RouterView, {
      attachTo: document.body,
      global: {
        plugins: [pinia, router, i18n, [VueQueryPlugin, { queryClient }]],
      },
    })
    await flushPromises()

    expect((wrapper.get('#workbench-title').element as HTMLInputElement).value).toBe(
      validSubmission.title,
    )
    const adminDraftKey = getFormWorkbenchDraftKey(adminPrincipalId)
    sessionStorage.removeItem(adminDraftKey)

    vi.useFakeTimers()
    await wrapper.get('#workbench-title').setValue('Autosaved release request')
    await vi.advanceTimersByTimeAsync(FORM_WORKBENCH_DRAFT_DEBOUNCE_MS - 1)
    expect(sessionStorage.getItem(adminDraftKey)).toBeNull()
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    const savedDraft = readFormWorkbenchDraft(sessionStorage, adminPrincipalId)
    expect(savedDraft?.values.title).toBe('Autosaved release request')

    vi.useRealTimers()
    await router.push('/other')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/workbench')
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      'Discard unsaved changes?',
    )
  })

  it('focuses the first invalid field when a workflow step cannot advance', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/workbench', component: FormWorkbench }],
    })
    await router.push('/workbench')
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const pinia = createPinia()
    const authStore = useAuthStore(pinia)
    const { password: _password, ...admin } = mockUsers[0]!
    authStore.setToken(generateMockToken(admin.id))
    authStore.setAuthenticatedPrincipal(getTestPrincipal(admin))
    const wrapper = mount(RouterView, {
      attachTo: document.body,
      global: {
        plugins: [pinia, router, i18n, [VueQueryPlugin, { queryClient }]],
      },
    })
    await flushPromises()

    const nextButton = wrapper.findAll('button').find(button => button.text() === 'Next')
    expect(nextButton).toBeDefined()
    await nextButton!.trigger('click')
    await flushPromises()

    const titleInput = wrapper.get<HTMLInputElement>('#workbench-title')
    // AI modified: async schema validation is complete only after both error paint and focus transfer settle.
    await vi.waitFor(() => {
      expect(titleInput.attributes('aria-invalid')).toBe('true')
      expect(document.activeElement).toBe(titleInput.element)
    })
  })

  it('advances when title blur and the Next action share an availability check', async () => {
    let releaseResponse!: () => void
    let markRequestStarted!: () => void
    const responseGate = new Promise<void>((resolve) => {
      releaseResponse = resolve
    })
    const requestStarted = new Promise<void>((resolve) => {
      markRequestStarted = resolve
    })
    let requestCount = 0
    server.use(
      mswHttp.get('/api/form-workbench/title-availability', async ({ request }) => {
        requestCount += 1
        markRequestStarted()
        await responseGate
        const title = new URL(request.url).searchParams.get('title') ?? ''
        return HttpResponse.json({
          code: 0,
          message: 'success',
          data: { title, isAvailable: true },
        })
      }),
    )
    sessionStorage.setItem(
      getFormWorkbenchDraftKey(adminPrincipalId),
      JSON.stringify(getFormWorkbenchDraft(validSubmission, adminPrincipalId)),
    )
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/workbench', component: FormWorkbench }],
    })
    await router.push('/workbench')
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const pinia = createPinia()
    const authStore = useAuthStore(pinia)
    const { password: _password, ...admin } = mockUsers[0]!
    authStore.setToken(generateMockToken(admin.id))
    authStore.setAuthenticatedPrincipal(getTestPrincipal(admin))
    const wrapper = mount(RouterView, {
      attachTo: document.body,
      global: {
        plugins: [pinia, router, i18n, [VueQueryPlugin, { queryClient }]],
      },
    })
    await flushPromises()

    const titleInput = wrapper.get<HTMLInputElement>('#workbench-title')
    await titleInput.trigger('blur')
    await requestStarted
    await flushPromises()

    const nextButton = wrapper.findAll('button').find(button => button.text() === 'Next')
    expect(nextButton).toBeDefined()
    // AI modified: an in-flight blur check must not disable the click that advances the workflow.
    expect(nextButton!.attributes('disabled')).toBeUndefined()
    await nextButton!.trigger('click')
    releaseResponse()
    await flushPromises()

    expect(requestCount).toBe(1)
    expect(wrapper.text()).toContain('Content and files')
  })

  it('ignores a late title response after the field starts a newer validation', async () => {
    let releaseFirstResponse!: () => void
    let releaseSecondResponse!: () => void
    let markFirstStarted!: () => void
    let markSecondStarted!: () => void
    const firstResponseGate = new Promise<void>((resolve) => {
      releaseFirstResponse = resolve
    })
    const secondResponseGate = new Promise<void>((resolve) => {
      releaseSecondResponse = resolve
    })
    const firstRequestStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve
    })
    const secondRequestStarted = new Promise<void>((resolve) => {
      markSecondStarted = resolve
    })
    let requestCount = 0
    server.use(
      mswHttp.get('/api/form-workbench/title-availability', async ({ request }) => {
        const title = new URL(request.url).searchParams.get('title') ?? ''
        const requestNumber = ++requestCount
        if (requestNumber === 1) {
          markFirstStarted()
          await firstResponseGate
        }
        else {
          markSecondStarted()
          await secondResponseGate
        }

        return HttpResponse.json({
          code: 0,
          message: 'success',
          data: { title, isAvailable: requestNumber !== 1 },
        })
      }),
    )

    sessionStorage.setItem(
      getFormWorkbenchDraftKey(adminPrincipalId),
      JSON.stringify(getFormWorkbenchDraft(validSubmission, adminPrincipalId)),
    )
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/workbench', component: FormWorkbench }],
    })
    await router.push('/workbench')
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const pinia = createPinia()
    const authStore = useAuthStore(pinia)
    const { password: _password, ...admin } = mockUsers[0]!
    authStore.setToken(generateMockToken(admin.id))
    authStore.setAuthenticatedPrincipal(getTestPrincipal(admin))
    const wrapper = mount(RouterView, {
      attachTo: document.body,
      global: {
        plugins: [pinia, router, i18n, [VueQueryPlugin, { queryClient }]],
      },
    })
    await flushPromises()

    const titleInput = wrapper.get<HTMLInputElement>('#workbench-title')
    await titleInput.setValue('First pending title')
    await titleInput.trigger('blur')
    await firstRequestStarted

    await titleInput.setValue('Current title')
    await titleInput.trigger('blur')
    await secondRequestStarted
    releaseFirstResponse()
    await flushPromises()

    expect(wrapper.text()).toContain('Checking title availability')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)

    releaseSecondResponse()
    await flushPromises()

    // AI modified: only the request that still owns the current title may publish availability.
    expect(wrapper.text()).toContain('This title is available.')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })
})

describe('form workbench API', () => {
  beforeEach(() => {
    resetMockFormWorkbench()
    sessionStorage.setItem('auth_token', generateMockToken(1))
  })
  afterEach(() => sessionStorage.removeItem('auth_token'))

  it('performs asynchronous title uniqueness validation', async () => {
    await expect(
      get<TitleAvailabilityResponse>('/form-workbench/title-availability', {
        title: 'Quarterly Access Review',
      }),
    ).resolves.toEqual({ title: 'Quarterly Access Review', isAvailable: false })
    await expect(
      get<TitleAvailabilityResponse>('/form-workbench/title-availability', {
        title: validSubmission.title,
      }),
    ).resolves.toEqual({ title: validSubmission.title, isAvailable: true })
  })

  it('saves once and rejects the duplicate title at the write boundary', async () => {
    await expect(post('/form-workbench/submissions', validSubmission)).resolves.toMatchObject({
      id: 'form-submission-1',
    })
    await expect(post('/form-workbench/submissions', validSubmission)).rejects.toMatchObject({
      code: 'FORM_TITLE_EXISTS',
      status: 409,
    })
  })

  it('allows editor Content creation and rejects viewers without that action', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(2))
    await expect(
      get('/form-workbench/title-availability', { title: 'A new title' }),
    ).resolves.toMatchObject({
      isAvailable: true,
    })
    await expect(post('/form-workbench/submissions', validSubmission)).resolves.toMatchObject({
      id: 'form-submission-1',
    })

    sessionStorage.setItem('auth_token', generateMockToken(3))
    await expect(
      post('/form-workbench/submissions', {
        ...validSubmission,
        title: 'Viewer submission',
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
  })
})
