import type { VueWrapper } from '@vue/test-utils'
import type { AxiosResponse } from 'axios'
import type {
  SchemaDrivenSubmissionFields,
  SchemaDrivenSubmissionResponse,
} from '@/features/component-gallery/forms/schema-driven-form'
import type { ApiEnvelope } from '@/lib/http'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { AxiosHeaders } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import BasicFormExample from '@/features/component-gallery/forms/components/BasicFormExample.vue'
import DynamicFormExample from '@/features/component-gallery/forms/components/DynamicFormExample.vue'
import SchemaDrivenFormExample from '@/features/component-gallery/forms/components/SchemaDrivenFormExample.vue'
import SteppedFormExample from '@/features/component-gallery/forms/components/SteppedFormExample.vue'
import SuperFormExample from '@/features/component-gallery/forms/components/SuperFormExample.vue'
import ValidationFormExample from '@/features/component-gallery/forms/components/ValidationFormExample.vue'
import FormExamplesPage from '@/features/component-gallery/forms/FormExamplesPage.vue'
import {
  getSubmittableSchemaFields,
  getVisibleSchemaFields,
  SCHEMA_DRIVEN_EVIDENCE_MAX_BYTES,
  SCHEMA_DRIVEN_FIELDS,
} from '@/features/component-gallery/forms/schema-driven-form'
import {
  SCHEMA_DRIVEN_SUBMISSION_FIELDS_SCHEMA,
  SCHEMA_DRIVEN_SUBMISSION_RESPONSE_SCHEMA,
} from '@/features/component-gallery/forms/schema-driven-form-api-contracts'
import { i18n, setLocale } from '@/i18n'
import { ApiError, http as httpClient, post } from '@/lib/http'
import { generateMockToken } from '@/mocks/data/users'

enableAutoUnmount(afterEach)

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
})

beforeEach(async () => {
  setLocale('en-US')
  document.body.innerHTML = ''
  localStorage.removeItem('auth_token')
  sessionStorage.setItem('auth_token', generateMockToken(1))
  await router.push('/')
})

afterEach(() => {
  localStorage.removeItem('auth_token')
  sessionStorage.removeItem('auth_token')
})

function mountExample(component: Parameters<typeof mount>[0]): VueWrapper {
  // AI modified: connected forms exercise browser focus and native submit behavior rather than detached DOM shortcuts.
  return mount(component, {
    attachTo: document.body,
    global: { plugins: [i18n, router] },
  })
}

function getButton(wrapper: VueWrapper, label: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text().trim() === label)
  if (!button) throw new Error(`Could not find button: ${label}`)
  return button
}

const validSchemaSubmission: SchemaDrivenSubmissionFields = {
  requestName: 'Atomic release request',
  environment: 'staging',
  serviceOwner: 'release-engineering',
  urgency: 'normal',
  requiresEvidence: false,
  richBrief: '<p>Release after every verification gate passes.</p>',
  notes: '',
}

const validPdfBytes = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0x45, 0x4f, 0x46,
])
const oversizedPdfBytes = new Uint8Array(SCHEMA_DRIVEN_EVIDENCE_MAX_BYTES + 1)
oversizedPdfBytes.set(validPdfBytes)

interface SchemaEvidenceFixture {
  bytes: Uint8Array
  contentType: string
  fileName: string
}

interface SchemaMultipartPartFixture {
  bytes: Uint8Array
  contentType?: string
  fileName?: string
  name: string
}

interface SchemaMultipartFixture {
  body: Uint8Array
  contentType: string
}

function getSchemaMultipartFixture(
  submission: SchemaDrivenSubmissionFields,
  evidenceFiles: SchemaEvidenceFixture[] = [],
  additionalParts: SchemaMultipartPartFixture[] = [],
): SchemaMultipartFixture {
  const boundary = 'gvueter-schema-submission-boundary'
  const encoder = new TextEncoder()
  const parts: SchemaMultipartPartFixture[] = [
    {
      bytes: encoder.encode(JSON.stringify(submission)),
      contentType: 'application/json',
      fileName: 'submission.json',
      name: 'submission',
    },
    ...evidenceFiles.map((evidenceFile) => ({
      ...evidenceFile,
      name: 'evidence',
    })),
    ...additionalParts,
  ]
  const chunks: Uint8Array[] = []
  for (const part of parts) {
    chunks.push(
      encoder.encode(
        `--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"${
          part.fileName === undefined ? '' : `; filename="${part.fileName}"`
        }\r\nContent-Type: ${part.contentType ?? 'text/plain'}\r\n\r\n`,
      ),
      part.bytes,
      encoder.encode('\r\n'),
    )
  }
  chunks.push(encoder.encode(`--${boundary}--\r\n`))

  const body = new Uint8Array(chunks.reduce((byteCount, chunk) => byteCount + chunk.byteLength, 0))
  let byteOffset = 0
  for (const chunk of chunks) {
    body.set(chunk, byteOffset)
    byteOffset += chunk.byteLength
  }
  return { body, contentType: `multipart/form-data; boundary=${boundary}` }
}

function submitSchemaMultipart(
  submission: SchemaDrivenSubmissionFields,
  evidenceFiles: SchemaEvidenceFixture[] = [],
  additionalParts: SchemaMultipartPartFixture[] = [],
): Promise<SchemaDrivenSubmissionResponse> {
  const fixture = getSchemaMultipartFixture(submission, evidenceFiles, additionalParts)
  return post<SchemaDrivenSubmissionResponse>('/component-gallery/form/submissions', fixture.body, {
    headers: { 'Content-Type': fixture.contentType },
    responseSchema: SCHEMA_DRIVEN_SUBMISSION_RESPONSE_SCHEMA,
  })
}

function readBrowserBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result ?? '')), { once: true })
    reader.addEventListener('error', () => reject(reader.error), { once: true })
    reader.readAsText(blob)
  })
}

function getSchemaAxiosResponse(
  response: SchemaDrivenSubmissionResponse,
): AxiosResponse<ApiEnvelope<SchemaDrivenSubmissionResponse>> {
  return {
    config: { headers: new AxiosHeaders() },
    data: { code: 0, message: 'created', data: response },
    headers: new AxiosHeaders(),
    status: 201,
    statusText: 'Created',
  }
}

describe('form example module', () => {
  it('presents seven addressable examples across six form responsibilities and localizes them', async () => {
    const wrapper = mountExample(FormExamplesPage)

    expect(wrapper.findAll('section[id$="-form-example"]')).toHaveLength(6)
    // AI modified: field controls remain reachable as a seventh destination after the tab-to-route split.
    expect(wrapper.findAll('nav[aria-label="Form example navigation"] a')).toHaveLength(7)
    expect(wrapper.get('#field-control-examples').find('[role="search"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Complete form patterns')
    expect(wrapper.text()).toContain('Super form: cloud environment provisioning')

    setLocale('zh-CN')
    await flushPromises()
    expect(wrapper.text()).toContain('完整表单模式')
    expect(wrapper.text()).toContain('超级 Form：云环境开通')
  })

  it('drives conditional, permission, upload, and rich-text responsibilities from one schema', () => {
    const baseValues = {
      requestName: 'Release request',
      environment: 'staging' as const,
      serviceOwner: 'release-engineering',
      approverEmail: '',
      urgency: 'normal' as const,
      requiresEvidence: false,
      richBrief: '<p>Release brief</p>',
      notes: '',
    }
    expect(SCHEMA_DRIVEN_FIELDS.map((field) => field.kind)).toEqual([
      'text',
      'select',
      'remote-select',
      'email',
      'select',
      'switch',
      'file',
      'rich-text',
      'textarea',
    ])
    expect(getVisibleSchemaFields(baseValues).map((field) => field.name)).not.toContain(
      'approverEmail',
    )
    expect(
      getVisibleSchemaFields({
        ...baseValues,
        environment: 'production',
        requiresEvidence: true,
      }).map((field) => field.name),
    ).toEqual(expect.arrayContaining(['approverEmail', 'evidence']))
    expect(SCHEMA_DRIVEN_FIELDS.find((field) => field.name === 'evidence')).toMatchObject({
      kind: 'file',
      required: true,
    })
    expect(
      getSubmittableSchemaFields(
        { ...baseValues, environment: 'production', approverEmail: 'approver@example.com' },
        { canWriteSensitiveFields: false },
      ).map((field) => field.name),
    ).not.toContain('approverEmail')
  })

  it('loads dependency-linked owner options and clears values revoked by visibility or access', async () => {
    const wrapper = mountExample(SchemaDrivenFormExample)
    await flushPromises()

    const ownerSelect = wrapper.get('#schema-driven-serviceOwner')
    expect(ownerSelect.text()).toContain('Release Engineering')
    await ownerSelect.setValue('release-engineering')

    await wrapper.get('#schema-driven-environment').setValue('production')
    await flushPromises()
    expect((ownerSelect.element as HTMLSelectElement).value).toBe('')
    expect(ownerSelect.text()).toContain('Site Reliability Engineering')
    expect(wrapper.find('#schema-driven-approverEmail').exists()).toBe(true)

    await wrapper.get('#schema-driven-approverEmail').setValue('approver@example.com')
    await wrapper.get('#schema-sensitive-access').trigger('click')
    expect(wrapper.get('#schema-driven-approverEmail').attributes('disabled')).toBeDefined()
    expect((wrapper.get('#schema-driven-approverEmail').element as HTMLInputElement).value).toBe('')

    await ownerSelect.setValue('site-reliability')
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue(
      getSchemaAxiosResponse({
        submissionId: 'schema-submission-projection',
        submittedAt: '2026-07-29T08:00:00.000Z',
        evidence: [],
      }),
    )
    try {
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      const submissionBody = postSpy.mock.calls[0]?.[1]
      expect(submissionBody).toBeInstanceOf(FormData)
      const submissionPart = (submissionBody as FormData).get('submission')
      expect(submissionPart).toMatchObject({
        name: 'submission.json',
        type: 'application/json',
      })
      const submittedFields: unknown =
        submissionPart instanceof Blob
          ? JSON.parse(await readBrowserBlob(submissionPart))
          : undefined
      // AI modified: read-only sensitive values are absent from the wire contract, not sent as blanks.
      expect(submittedFields).not.toHaveProperty('approverEmail')
      expect(wrapper.get('[data-testid="schema-form-status"]').text()).toContain(
        'Fields and files were sent',
      )
    } finally {
      postSpy.mockRestore()
    }

    await wrapper.get('#schema-driven-environment').setValue('staging')
    await flushPromises()
    expect(wrapper.find('#schema-driven-approverEmail').exists()).toBe(false)
    await wrapper.get('#schema-driven-environment').setValue('production')
    await flushPromises()
    expect((wrapper.get('#schema-driven-approverEmail').element as HTMLInputElement).value).toBe('')
  })

  it('submits projected fields and real evidence bytes through one multipart request', async () => {
    const FileUploadStub = defineComponent({
      props: {
        modelValue: { type: Array, default: () => [] },
      },
      emits: ['update:modelValue'],
      setup(_props, { emit }) {
        const selectEvidence = () => {
          emit('update:modelValue', [
            {
              id: 'schema-proof',
              file: new File([validPdfBytes], 'release-proof.pdf', {
                type: 'application/pdf',
              }),
            },
          ])
        }
        return { selectEvidence }
      },
      template:
        '<button type="button" data-select-schema-evidence @click="selectEvidence">Select evidence</button>',
    })
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue(
      getSchemaAxiosResponse({
        submissionId: 'schema-submission-client',
        submittedAt: '2026-07-29T08:00:00.000Z',
        evidence: [
          {
            fileId: 'schema-evidence-client',
            fileName: 'release-proof.pdf',
            contentType: 'application/pdf',
            sizeBytes: validPdfBytes.byteLength,
            uploadedAt: '2026-07-29T08:00:00.000Z',
          },
        ],
      }),
    )
    try {
      const wrapper = mount(SchemaDrivenFormExample, {
        attachTo: document.body,
        global: {
          plugins: [i18n, router],
          stubs: { FileUpload: FileUploadStub },
        },
      })
      await flushPromises()

      await wrapper.get('#schema-driven-serviceOwner').setValue('release-engineering')
      await wrapper.get('#schema-driven-requiresEvidence').trigger('click')
      await wrapper.get('[data-select-schema-evidence]').trigger('click')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      const submissionBody = postSpy.mock.calls[0]?.[1]
      expect(submissionBody).toBeInstanceOf(FormData)
      const evidencePart = (submissionBody as FormData).get('evidence')
      expect(evidencePart).toBeInstanceOf(File)
      expect(evidencePart).toMatchObject({
        name: 'release-proof.pdf',
        size: validPdfBytes.byteLength,
        type: 'application/pdf',
      })
      expect(wrapper.get('[data-testid="schema-form-status"]').text()).toContain('1 file(s) stored')
      expect(wrapper.get('[data-testid="schema-form-status"]').text()).toContain(
        'schema-submission-client',
      )
    } finally {
      postSpy.mockRestore()
    }
  })

  it('maps only known server field errors and focuses the first invalid control', async () => {
    const FileUploadStub = defineComponent({
      emits: ['update:modelValue'],
      setup(_props, { emit }) {
        const selectEvidence = () =>
          emit('update:modelValue', [
            {
              id: 'server-error-proof',
              file: new File([validPdfBytes], 'release-proof.pdf', {
                type: 'application/pdf',
              }),
            },
          ])
        return { selectEvidence }
      },
      template:
        '<button type="button" data-select-server-error-evidence @click="selectEvidence">Select evidence</button>',
    })
    const postSpy = vi.spyOn(httpClient, 'post').mockRejectedValue(
      new ApiError('INVALID_SCHEMA_FIELDS', 'Correct the submitted fields.', 422, {
        fieldErrors: {
          evidence: 'The server rejected this evidence.',
          ignoredField: 'This field must not enter component state.',
          requestName: 'The server rejected this request name.',
          serviceOwner: 'The server rejected this owner.',
        },
      }),
    )
    try {
      const wrapper = mount(SchemaDrivenFormExample, {
        attachTo: document.body,
        global: {
          plugins: [i18n, router],
          stubs: { FileUpload: FileUploadStub },
        },
      })
      await flushPromises()

      await wrapper.get('#schema-driven-serviceOwner').setValue('release-engineering')
      await wrapper.get('#schema-driven-requiresEvidence').trigger('click')
      await wrapper.get('[data-select-server-error-evidence]').trigger('click')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      const requestName = wrapper.get('#schema-driven-requestName')
      expect(wrapper.get('#schema-driven-requestName-error').text()).toBe(
        'The server rejected this request name.',
      )
      expect(wrapper.get('#schema-driven-serviceOwner-error').text()).toBe(
        'The server rejected this owner.',
      )
      expect(wrapper.get('[data-schema-field="evidence"] [role="alert"]').text()).toBe(
        'The server rejected this evidence.',
      )
      expect(wrapper.text()).not.toContain('This field must not enter component state.')
      expect(document.activeElement).toBe(requestName.element)
    } finally {
      postSpy.mockRestore()
    }
  })

  it('saves and restores the controlled basic profile', async () => {
    const wrapper = mountExample(BasicFormExample)
    await wrapper.get('#basic-profile-name').setValue('Morgan Lee')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[data-testid="basic-form-status"]').text()).toContain('Morgan Lee')

    await getButton(wrapper, 'Restore example').trigger('click')
    expect((wrapper.get('#basic-profile-name').element as HTMLInputElement).value).toBe(
      'Avery Chen',
    )
    expect(wrapper.get('[data-testid="basic-form-status"]').text()).toContain('Restored')
  })

  it('returns client and server validation errors to their fields before succeeding', async () => {
    const wrapper = mountExample(ValidationFormExample)
    await wrapper.get('form').trigger('submit')

    const emailInput = wrapper.get('#validation-request-email')
    expect(emailInput.attributes('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(emailInput.element)
    expect(wrapper.get('[data-testid="validation-form-status"]').text()).toContain('Correct')

    await emailInput.setValue('operator@reserved.example')
    await wrapper.get('#validation-cost-center').setValue('OPS-2048')
    await wrapper
      .get('#validation-access-reason')
      .setValue('Inspect the audit archive before 31 July.')
    ;(wrapper.get('#validation-cost-center').element as HTMLInputElement).focus()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('#validation-request-email-error').text()).toContain(
      'pending access request',
    )
    expect(document.activeElement).toBe(emailInput.element)

    await emailInput.setValue('operator@example.com')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-testid="validation-form-status"]').text()).toContain(
      'passed client and server validation',
    )
    expect(emailInput.attributes('aria-invalid')).toBe('false')
  })

  it('keeps dynamic contact errors attached to stable rows after add and remove', async () => {
    const wrapper = mountExample(DynamicFormExample)
    await getButton(wrapper, 'Add contact').trigger('click')
    expect(wrapper.findAll('fieldset')).toHaveLength(2)

    await wrapper.get('#notification-contact-2-email').setValue('incident-owner@example.com')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('#notification-contact-2-error').text()).toContain('different email')

    await wrapper.get('#notification-contact-2-email').setValue('compliance@example.com')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[data-testid="dynamic-form-status"]').text()).toContain('2 contacts')

    await wrapper.get('button[aria-label="Remove contact 2"]').trigger('click')
    expect(wrapper.findAll('fieldset')).toHaveLength(1)
    expect(wrapper.find('#notification-contact-2-error').exists()).toBe(false)
  })

  it('gates stepped navigation, preserves inputs, and submits the review', async () => {
    const wrapper = mountExample(SteppedFormExample)
    await getButton(wrapper, 'Validate and continue').trigger('click')
    expect(wrapper.get('[data-testid="stepped-form-status"]').text()).toContain('fields to correct')
    expect(wrapper.get('#stepped-rollout-name').attributes('aria-invalid')).toBe('true')

    await wrapper.get('#stepped-rollout-name').setValue('Billing service rollout')
    await wrapper.get('#stepped-rollout-owner').setValue('release-owner@example.com')
    await getButton(wrapper, 'Validate and continue').trigger('click')
    expect(wrapper.get('#stepped-rollout-window').isVisible()).toBe(true)

    await wrapper.get('#stepped-rollout-window').setValue('2026-07-20T22:00')
    await wrapper
      .get('#stepped-rollout-runbook')
      .setValue('Restore the previous image and verify all health checks.')
    await getButton(wrapper, 'Validate and continue').trigger('click')
    expect(wrapper.text()).toContain('Rollout plan review')
    expect(wrapper.text()).toContain('Billing service rollout')

    await getButton(wrapper, 'Submit rollout plan').trigger('click')
    expect(wrapper.get('[data-testid="stepped-form-status"]').text()).toContain('was submitted')
  })

  it('enforces super-form dependencies and updates its locale-aware estimate', async () => {
    const wrapper = mountExample(SuperFormExample)
    expect(wrapper.get('[data-testid="super-form-total"]').text()).toContain('680')

    await wrapper.get('#super-environment').setValue('production')
    await wrapper.get('#super-database').trigger('click')
    expect(wrapper.find('#super-approver-email').exists()).toBe(true)
    expect(wrapper.find('#super-backup-policy').exists()).toBe(true)
    expect(wrapper.get('[data-testid="super-form-total"]').text()).toContain('2,420')

    await wrapper.get('#super-budget-limit').setValue('100')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('#super-approver-email-error').text()).toContain('valid approver email')
    expect(wrapper.get('#super-backup-policy-error').text()).toContain('backup policy')
    expect(wrapper.get('#super-budget-limit-error').text()).toContain('monthly estimate')

    await wrapper.get('#super-approver-email').setValue('director@example.com')
    await wrapper.get('#super-backup-policy').setValue('weekly')
    await wrapper.get('#super-budget-limit').setValue('3000')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[data-testid="super-form-status"]').text()).toContain('approval queue')
    expect(wrapper.get('[data-testid="super-form-total"]').text()).toContain('2,500')
  })
})

describe('schema-driven multipart submission contract', () => {
  it('stores real evidence bytes and returns a downloadable server receipt', async () => {
    const savedSubmission = await submitSchemaMultipart(
      { ...validSchemaSubmission, requiresEvidence: true },
      [
        {
          bytes: validPdfBytes,
          contentType: 'application/pdf',
          fileName: 'release-proof.pdf',
        },
      ],
    )

    expect(savedSubmission).toMatchObject({
      submissionId: 'schema-submission-1',
      evidence: [
        {
          fileName: 'release-proof.pdf',
          contentType: 'application/pdf',
          sizeBytes: validPdfBytes.byteLength,
        },
      ],
    })
    const fileId = savedSubmission.evidence[0]?.fileId
    expect(fileId).toMatch(/^schema-evidence-/)

    const token = sessionStorage.getItem('auth_token')
    const downloadResponse = await fetch(`/api/component-gallery/files/${fileId}`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    })
    expect(downloadResponse.status).toBe(200)
    expect(downloadResponse.headers.get('Content-Disposition')).toContain(
      "filename*=UTF-8''release-proof.pdf",
    )
    expect(new Uint8Array(await downloadResponse.arrayBuffer())).toEqual(validPdfBytes)
  })

  it('rejects file-name strings and JSON fields that impersonate uploaded evidence', async () => {
    await expect(
      submitSchemaMultipart(
        { ...validSchemaSubmission, requiresEvidence: true },
        [],
        [
          {
            bytes: new TextEncoder().encode('release-proof.pdf'),
            name: 'evidence',
          },
        ],
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_SCHEMA_EVIDENCE',
      status: 422,
    })

    await expect(
      submitSchemaMultipart(
        validSchemaSubmission,
        [],
        [
          {
            bytes: new TextEncoder().encode('release-proof.pdf'),
            name: 'evidenceFileNames',
          },
        ],
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_SCHEMA_MULTIPART',
      status: 422,
    })

    expect(
      SCHEMA_DRIVEN_SUBMISSION_FIELDS_SCHEMA.safeParse({
        ...validSchemaSubmission,
        evidenceFileNames: ['release-proof.pdf'],
      }).success,
    ).toBe(false)
  })

  it.each([
    {
      label: 'missing required bytes',
      submission: { ...validSchemaSubmission, requiresEvidence: true },
      files: [],
      expectedCode: 'INVALID_SCHEMA_EVIDENCE',
    },
    {
      label: 'more than three files',
      submission: { ...validSchemaSubmission, requiresEvidence: true },
      files: Array.from(
        { length: 4 },
        (_, index) =>
          ({
            bytes: validPdfBytes,
            contentType: 'application/pdf',
            fileName: `release-proof-${index}.pdf`,
          }) satisfies SchemaEvidenceFixture,
      ),
      expectedCode: 'INVALID_SCHEMA_EVIDENCE',
    },
    {
      label: 'an unsupported MIME type',
      submission: { ...validSchemaSubmission, requiresEvidence: true },
      files: [
        {
          bytes: new TextEncoder().encode('plain text'),
          contentType: 'text/plain',
          fileName: 'release-proof.txt',
        },
      ],
      expectedCode: 'INVALID_SCHEMA_EVIDENCE',
    },
    {
      label: 'an unsafe file name',
      submission: { ...validSchemaSubmission, requiresEvidence: true },
      files: [
        {
          bytes: validPdfBytes,
          contentType: 'application/pdf',
          fileName: '../release-proof.pdf',
        },
      ],
      expectedCode: 'INVALID_SCHEMA_EVIDENCE',
    },
    {
      label: 'a mismatched file signature',
      submission: { ...validSchemaSubmission, requiresEvidence: true },
      files: [
        {
          bytes: new TextEncoder().encode('not a pdf'),
          contentType: 'application/pdf',
          fileName: 'release-proof.pdf',
        },
      ],
      expectedCode: 'INVALID_SCHEMA_EVIDENCE_BYTES',
    },
    {
      label: 'more than eight MiB of bytes',
      submission: { ...validSchemaSubmission, requiresEvidence: true },
      files: [
        {
          bytes: oversizedPdfBytes,
          contentType: 'application/pdf',
          fileName: 'release-proof.pdf',
        },
      ],
      expectedCode: 'INVALID_SCHEMA_EVIDENCE_BYTES',
    },
  ])('rejects $label', async ({ expectedCode, files, submission }) => {
    await expect(submitSchemaMultipart(submission, files)).rejects.toMatchObject({
      code: expectedCode,
      status: 422,
    })
  })

  it('requires Content create permission at the server boundary', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(3))

    await expect(submitSchemaMultipart(validSchemaSubmission)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
  })

  it('returns a 409 field error without accepting a conflicting submission', async () => {
    await expect(
      submitSchemaMultipart({
        ...validSchemaSubmission,
        requestName: 'Conflict release request',
      }),
    ).rejects.toMatchObject({
      code: 'SCHEMA_SUBMISSION_CONFLICT',
      details: {
        fieldErrors: {
          requestName: 'Choose a unique release-request name.',
        },
      },
      status: 409,
    })
  })
})
