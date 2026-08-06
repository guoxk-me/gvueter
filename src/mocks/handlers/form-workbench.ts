import type {
  SchemaDrivenEvidenceMimeType,
  SchemaDrivenSubmissionFields,
  SchemaDrivenSubmissionResponse,
  SchemaEnvironment,
  SchemaOwnerOptionsResponse,
} from '@/features/component-gallery/forms/schema-driven-form'
import type {
  FormWorkbenchSaveResponse,
  FormWorkbenchSubmitInput,
  TitleAvailabilityResponse,
} from '@/features/form-workbench/types'
import type { UploadReceipt } from '@/lib/api-contracts'
import type { ApiResponse } from '@/lib/http'
import { http, HttpResponse } from 'msw'
import { isUploadFileNameSafe } from '@/components/admin/file-upload'
import { sanitizeRichTextHtml } from '@/components/admin/rich-text-safety'
import {
  SCHEMA_DRIVEN_EVIDENCE_MAX_BYTES,
  SCHEMA_DRIVEN_EVIDENCE_MAX_FILES,
  SCHEMA_DRIVEN_EVIDENCE_MIME_TYPES,
} from '@/features/component-gallery/forms/schema-driven-form'
import { SCHEMA_DRIVEN_SUBMISSION_FIELDS_SCHEMA } from '@/features/component-gallery/forms/schema-driven-form-api-contracts'
import { FORM_WORKBENCH_SUBMIT_INPUT_SCHEMA } from '@/features/form-workbench/form-workbench-api-contracts'
import { readMockMultipartParts } from '@/mocks/multipart'
import { readMockJsonBody } from '@/mocks/request-validation'
import { authorizeMockPermission } from './auth'
import { saveGalleryEvidenceFile } from './component-gallery-uploads'

const reservedTitles = new Set(['quarterly access review', 'existing request'])
const savedSubmissions: FormWorkbenchSubmitInput[] = []
const savedSchemaSubmissions: Array<
  SchemaDrivenSubmissionFields & {
    evidenceFileIds: string[]
    submissionId: string
    submittedAt: string
  }
> = []
let submissionSequence = 1
let schemaSubmissionSequence = 1
const MAX_MOCK_FORM_SUBMISSIONS = 500
const MAX_MOCK_SCHEMA_SUBMISSIONS = 500
const MAX_SCHEMA_SUBMISSION_JSON_BYTES = 256 * 1024
const MAX_SCHEMA_MULTIPART_BYTES =
  MAX_SCHEMA_SUBMISSION_JSON_BYTES +
  SCHEMA_DRIVEN_EVIDENCE_MAX_FILES * SCHEMA_DRIVEN_EVIDENCE_MAX_BYTES +
  64 * 1024
const schemaOwnerOptions: Record<SchemaEnvironment, SchemaOwnerOptionsResponse['options']> = {
  development: [
    { value: 'developer-experience', label: 'Developer Experience' },
    { value: 'quality-engineering', label: 'Quality Engineering' },
  ],
  staging: [
    { value: 'release-engineering', label: 'Release Engineering' },
    { value: 'platform-operations', label: 'Platform Operations' },
  ],
  production: [
    { value: 'site-reliability', label: 'Site Reliability Engineering' },
    { value: 'production-operations', label: 'Production Operations' },
  ],
}

function getComparableTitle(title: string): string {
  return title.trim().toLocaleLowerCase()
}

function isTitleAvailable(title: string): boolean {
  const comparableTitle = getComparableTitle(title)
  return (
    Boolean(comparableTitle) &&
    !reservedTitles.has(comparableTitle) &&
    !savedSubmissions.some((submission) => getComparableTitle(submission.title) === comparableTitle)
  )
}

type SchemaSubmissionErrorField = 'evidence' | 'requestName' | 'serviceOwner' | 'submission'

interface SchemaEvidenceCandidate {
  bytes: ArrayBuffer
  contentType: SchemaDrivenEvidenceMimeType
  fileName: string
}

type SchemaMultipartRead =
  | {
      isValid: true
      evidenceFiles: SchemaEvidenceCandidate[]
      submission: SchemaDrivenSubmissionFields
    }
  | { isValid: false; response: Response }

function schemaSubmissionFailure(
  code: string,
  message: string,
  status: number,
  fieldErrors?: Partial<Record<SchemaSubmissionErrorField, string>>,
): Response {
  return HttpResponse.json<
    ApiResponse<null | { fieldErrors: Partial<Record<SchemaSubmissionErrorField, string>> }>
  >(
    {
      code,
      message,
      data: fieldErrors ? { fieldErrors } : null,
    },
    { status },
  )
}

function isSchemaEvidenceMimeType(
  contentType: string,
): contentType is SchemaDrivenEvidenceMimeType {
  return SCHEMA_DRIVEN_EVIDENCE_MIME_TYPES.includes(contentType as SchemaDrivenEvidenceMimeType)
}

function hasSchemaEvidenceExtension(
  fileName: string,
  contentType: SchemaDrivenEvidenceMimeType,
): boolean {
  const lowerFileName = fileName.toLocaleLowerCase()
  if (contentType === 'application/pdf') return lowerFileName.endsWith('.pdf')
  if (contentType === 'text/csv') return lowerFileName.endsWith('.csv')
  if (contentType === 'image/png') return lowerFileName.endsWith('.png')
  return lowerFileName.endsWith('.jpg') || lowerFileName.endsWith('.jpeg')
}

function hasSchemaEvidenceSignature(
  bytes: Uint8Array,
  contentType: SchemaDrivenEvidenceMimeType,
): boolean {
  const startsWith = (signature: readonly number[]) =>
    signature.every((byte, index) => bytes[index] === byte)

  if (contentType === 'application/pdf') return startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])
  if (contentType === 'image/png')
    return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (contentType === 'image/jpeg') return startsWith([0xff, 0xd8, 0xff])
  try {
    const csvText = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return Boolean(csvText.trim()) && !csvText.includes('\0')
  } catch {
    return false
  }
}

async function readSchemaMultipartSubmission(request: Request): Promise<SchemaMultipartRead> {
  const contentType = request.headers.get('Content-Type') ?? ''
  let requestBytes: ArrayBuffer
  try {
    requestBytes = await request.arrayBuffer()
  } catch {
    return {
      isValid: false,
      response: schemaSubmissionFailure(
        'INVALID_SCHEMA_MULTIPART',
        'The submission must use readable multipart form data.',
        422,
        { submission: 'Submit one application/json submission part.' },
      ),
    }
  }
  const multipartParts =
    requestBytes.byteLength <= MAX_SCHEMA_MULTIPART_BYTES
      ? readMockMultipartParts(contentType, requestBytes)
      : undefined
  if (!multipartParts) {
    return {
      isValid: false,
      response: schemaSubmissionFailure(
        'INVALID_SCHEMA_MULTIPART',
        'The submission must use bounded multipart form data.',
        422,
        { submission: 'Submit one application/json submission part.' },
      ),
    }
  }

  const unexpectedField = multipartParts.find(
    (part) => part.name !== 'submission' && part.name !== 'evidence',
  )
  if (unexpectedField) {
    return {
      isValid: false,
      response: schemaSubmissionFailure(
        'INVALID_SCHEMA_MULTIPART',
        'The multipart submission contains an unknown field.',
        422,
        { submission: `Unknown multipart field: ${unexpectedField.name}.` },
      ),
    }
  }

  const submissionParts = multipartParts.filter((part) => part.name === 'submission')
  const submissionPart = submissionParts[0]
  if (
    submissionParts.length !== 1 ||
    !submissionPart ||
    submissionPart.fileName !== 'submission.json' ||
    submissionPart.contentType !== 'application/json' ||
    submissionPart.bytes.byteLength > MAX_SCHEMA_SUBMISSION_JSON_BYTES
  ) {
    return {
      isValid: false,
      response: schemaSubmissionFailure(
        'INVALID_SCHEMA_MULTIPART',
        'The JSON submission part is missing or invalid.',
        422,
        { submission: 'Submit one bounded application/json part.' },
      ),
    }
  }

  let submissionCandidate: unknown
  try {
    const submissionJson = new TextDecoder('utf-8', { fatal: true }).decode(submissionPart.bytes)
    submissionCandidate = JSON.parse(submissionJson) as unknown
  } catch {
    return {
      isValid: false,
      response: schemaSubmissionFailure(
        'INVALID_SCHEMA_SUBMISSION',
        'The submission part is not valid JSON.',
        422,
        { submission: 'Correct the JSON submission part.' },
      ),
    }
  }

  const submissionDecision = SCHEMA_DRIVEN_SUBMISSION_FIELDS_SCHEMA.safeParse(submissionCandidate)
  if (!submissionDecision.success) {
    return {
      isValid: false,
      response: schemaSubmissionFailure(
        'INVALID_SCHEMA_SUBMISSION',
        'The submitted fields do not match the release-request contract.',
        422,
        { submission: 'Correct the submitted fields.' },
      ),
    }
  }

  const evidenceParts = multipartParts.filter((part) => part.name === 'evidence')
  if (
    evidenceParts.length > SCHEMA_DRIVEN_EVIDENCE_MAX_FILES ||
    evidenceParts.some((evidencePart) => evidencePart.fileName === undefined)
  ) {
    return {
      isValid: false,
      response: schemaSubmissionFailure(
        'INVALID_SCHEMA_EVIDENCE',
        'Evidence must contain at most three binary file parts.',
        422,
        { evidence: 'Attach at most three files instead of file-name strings.' },
      ),
    }
  }
  if (submissionDecision.data.requiresEvidence !== evidenceParts.length > 0) {
    return {
      isValid: false,
      response: schemaSubmissionFailure(
        'INVALID_SCHEMA_EVIDENCE',
        'The evidence files do not match the submitted requirement.',
        422,
        {
          evidence: submissionDecision.data.requiresEvidence
            ? 'Attach at least one evidence file.'
            : 'Remove evidence files or enable the evidence requirement.',
        },
      ),
    }
  }

  const evidenceFiles: SchemaEvidenceCandidate[] = []
  for (const evidencePart of evidenceParts) {
    const fileName = evidencePart.fileName
    if (
      !fileName ||
      !isUploadFileNameSafe(fileName) ||
      !isSchemaEvidenceMimeType(evidencePart.contentType) ||
      !hasSchemaEvidenceExtension(fileName, evidencePart.contentType)
    ) {
      return {
        isValid: false,
        response: schemaSubmissionFailure(
          'INVALID_SCHEMA_EVIDENCE',
          'An evidence file has an unsafe name or unsupported type.',
          422,
          { evidence: 'Use a safe PDF, CSV, PNG, or JPEG file.' },
        ),
      }
    }

    const bytes = evidencePart.bytes
    if (
      bytes.byteLength === 0 ||
      bytes.byteLength > SCHEMA_DRIVEN_EVIDENCE_MAX_BYTES ||
      !hasSchemaEvidenceSignature(new Uint8Array(bytes), evidencePart.contentType)
    ) {
      return {
        isValid: false,
        response: schemaSubmissionFailure(
          'INVALID_SCHEMA_EVIDENCE_BYTES',
          'An evidence file is empty, too large, or does not match its declared type.',
          422,
          { evidence: 'Attach a valid file no larger than 8 MiB.' },
        ),
      }
    }

    evidenceFiles.push({
      bytes,
      contentType: evidencePart.contentType,
      fileName,
    })
  }

  return {
    isValid: true,
    evidenceFiles,
    submission: submissionDecision.data,
  }
}

export function resetMockFormWorkbench(): void {
  savedSubmissions.splice(0, savedSubmissions.length)
  savedSchemaSubmissions.splice(0, savedSchemaSubmissions.length)
  submissionSequence = 1
  schemaSubmissionSequence = 1
}

export const formWorkbenchTitleAvailabilityHandler = http.get(
  '/api/form-workbench/title-availability',
  ({ request }) => {
    const authentication = authorizeMockPermission(request, 'read', 'Content')
    if (!authentication.isAuthenticated) return authentication.response

    const title = new URL(request.url).searchParams.get('title')?.trim() ?? ''
    return HttpResponse.json<ApiResponse<TitleAvailabilityResponse>>({
      code: 0,
      message: 'success',
      data: { title, isAvailable: isTitleAvailable(title) },
    })
  },
)

export const schemaOwnerOptionsHandler = http.get(
  '/api/component-gallery/form/service-owners',
  ({ request }) => {
    const authentication = authorizeMockPermission(request, 'read', 'Dashboard')
    if (!authentication.isAuthenticated) return authentication.response

    const environment = new URL(request.url).searchParams.get('environment')
    if (
      environment !== 'development' &&
      environment !== 'staging' &&
      environment !== 'production'
    ) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'INVALID_ENVIRONMENT', message: 'Unknown environment', data: null },
        { status: 422 },
      )
    }

    // AI modified: the Gallery exercises a real request boundary for dependency-linked remote options.
    return HttpResponse.json<ApiResponse<SchemaOwnerOptionsResponse>>({
      code: 0,
      message: 'success',
      data: { environment, options: schemaOwnerOptions[environment] },
    })
  },
)

export const saveSchemaDrivenSubmissionHandler = http.post(
  '/api/component-gallery/form/submissions',
  async ({ request }) => {
    const authentication = authorizeMockPermission(request, 'create', 'Content')
    if (!authentication.isAuthenticated) return authentication.response

    const requestBody = await readSchemaMultipartSubmission(request)
    if (!requestBody.isValid) return requestBody.response
    const { evidenceFiles, submission } = requestBody

    if (
      !schemaOwnerOptions[submission.environment].some(
        (owner) => owner.value === submission.serviceOwner,
      )
    ) {
      return schemaSubmissionFailure(
        'INVALID_SCHEMA_OWNER',
        'The selected owner is not valid for the target environment.',
        422,
        { serviceOwner: 'Select an owner returned for the target environment.' },
      )
    }

    const comparableRequestName = submission.requestName.trim().toLocaleLowerCase()
    if (
      comparableRequestName.includes('conflict') ||
      savedSchemaSubmissions.some(
        (savedSubmission) =>
          savedSubmission.requestName.trim().toLocaleLowerCase() === comparableRequestName,
      )
    ) {
      return schemaSubmissionFailure(
        'SCHEMA_SUBMISSION_CONFLICT',
        'A release request with this name already exists.',
        409,
        { requestName: 'Choose a unique release-request name.' },
      )
    }
    if (savedSchemaSubmissions.length >= MAX_MOCK_SCHEMA_SUBMISSIONS) {
      return schemaSubmissionFailure(
        'SCHEMA_SUBMISSION_CAPACITY_REACHED',
        'The schema submission demo has reached its bounded capacity.',
        409,
      )
    }

    const submittedAt = new Date().toISOString()
    // AI modified: every file is validated before the first byte is retained, keeping the Mock write atomic.
    const evidence: UploadReceipt[] = evidenceFiles.map((evidenceFile) =>
      saveGalleryEvidenceFile({
        ...evidenceFile,
        uploadedAt: submittedAt,
      }),
    )
    const submissionId = `schema-submission-${schemaSubmissionSequence++}`
    savedSchemaSubmissions.push({
      ...submission,
      richBrief: sanitizeRichTextHtml(submission.richBrief),
      evidenceFileIds: evidence.map((receipt) => receipt.fileId),
      submissionId,
      submittedAt,
    })

    return HttpResponse.json<ApiResponse<SchemaDrivenSubmissionResponse>>(
      {
        code: 0,
        message: 'created',
        data: { submissionId, submittedAt, evidence },
      },
      { status: 201 },
    )
  },
)

export const saveFormWorkbenchHandler = http.post<never, FormWorkbenchSubmitInput>(
  '/api/form-workbench/submissions',
  async ({ request }) => {
    // AI modified: submissions are Content creation, so editors can use their configured write grant.
    const authentication = authorizeMockPermission(request, 'create', 'Content')
    if (!authentication.isAuthenticated) return authentication.response

    const requestBody = await readMockJsonBody(request, FORM_WORKBENCH_SUBMIT_INPUT_SCHEMA, {
      code: 'INVALID_FORM_SUBMISSION',
      message: '表单数据校验失败',
    })
    if (!requestBody.isValid) return requestBody.response
    const submission = requestBody.body
    if (!isTitleAvailable(submission.title)) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'FORM_TITLE_EXISTS', message: '表单标题已存在', data: null },
        { status: 409 },
      )
    }
    if (savedSubmissions.length >= MAX_MOCK_FORM_SUBMISSIONS) {
      // AI modified: repeated submissions cannot grow the in-memory workbench store without bound.
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'FORM_CAPACITY_REACHED', message: '表单提交数量已达到演示环境上限', data: null },
        { status: 409 },
      )
    }

    // AI modified: the mock repeats uniqueness and authorization checks at the write boundary.
    savedSubmissions.push({
      ...submission,
      // AI modified: direct API submissions cannot persist executable rich-text markup.
      richContent: sanitizeRichTextHtml(submission.richContent),
      reviewers: [...submission.reviewers],
      activeRange: submission.activeRange ? { ...submission.activeRange } : null,
      attachmentNames: [...submission.attachmentNames],
      imageNames: [...submission.imageNames],
    })
    return HttpResponse.json<ApiResponse<FormWorkbenchSaveResponse>>(
      {
        code: 0,
        message: 'created',
        data: {
          id: `form-submission-${submissionSequence++}`,
          submittedAt: new Date().toISOString(),
        },
      },
      { status: 201 },
    )
  },
)

export const formWorkbenchHandlers = [
  formWorkbenchTitleAvailabilityHandler,
  schemaOwnerOptionsHandler,
  saveSchemaDrivenSubmissionHandler,
  saveFormWorkbenchHandler,
]
