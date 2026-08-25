import type { UploadReceipt } from '@/lib/api-contracts'

export type SchemaEnvironment = 'development' | 'production' | 'staging'
export type SchemaUrgency = 'normal' | 'urgent'

export interface SchemaOwnerOption {
  label: string
  value: string
}

export interface SchemaOwnerOptionsResponse {
  environment: SchemaEnvironment
  options: SchemaOwnerOption[]
}

export const SCHEMA_DRIVEN_EVIDENCE_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/csv',
] as const
export const SCHEMA_DRIVEN_EVIDENCE_MAX_BYTES = 8 * 1024 * 1024
export const SCHEMA_DRIVEN_EVIDENCE_MAX_FILES = 3

export type SchemaDrivenEvidenceMimeType = (typeof SCHEMA_DRIVEN_EVIDENCE_MIME_TYPES)[number]

export interface SchemaDrivenValues {
  requestName: string
  environment: SchemaEnvironment
  serviceOwner: string
  approverEmail: string
  urgency: SchemaUrgency
  requiresEvidence: boolean
  richBrief: string
  notes: string
}

export interface SchemaDrivenSubmissionFields {
  requestName: string
  environment: SchemaEnvironment
  serviceOwner: string
  approverEmail?: string
  urgency: SchemaUrgency
  requiresEvidence: boolean
  richBrief: string
  notes: string
}

export interface SchemaDrivenSubmissionResponse {
  submissionId: string
  submittedAt: string
  evidence: UploadReceipt[]
}

export interface SchemaFieldAccess {
  canWriteSensitiveFields: boolean
}

interface SchemaFieldBase {
  required: boolean
  permission?: 'sensitive-write'
  visibleWhen?: (values: SchemaDrivenValues) => boolean
}

export type SchemaDrivenField = SchemaFieldBase
  & (
    | { name: 'requestName' | 'approverEmail' | 'notes', kind: 'email' | 'text' | 'textarea' }
    | { name: 'environment' | 'urgency', kind: 'select', options: readonly string[] }
    | {
      name: 'serviceOwner'
      kind: 'remote-select'
      dependsOn: 'environment'
      optionSource: 'service-owners'
    }
    | { name: 'requiresEvidence', kind: 'switch' }
    | { name: 'evidence', kind: 'file' }
    | { name: 'richBrief', kind: 'rich-text' }
  )

// AI modified: the complete example renders every field from one discriminated schema instead of hard-coded field markup.
export const SCHEMA_DRIVEN_FIELDS: readonly SchemaDrivenField[] = [
  { name: 'requestName', kind: 'text', required: true },
  {
    name: 'environment',
    kind: 'select',
    required: true,
    options: ['development', 'staging', 'production'],
  },
  {
    name: 'serviceOwner',
    kind: 'remote-select',
    required: true,
    dependsOn: 'environment',
    optionSource: 'service-owners',
  },
  {
    name: 'approverEmail',
    kind: 'email',
    required: true,
    permission: 'sensitive-write',
    visibleWhen: values => values.environment === 'production',
  },
  { name: 'urgency', kind: 'select', required: true, options: ['normal', 'urgent'] },
  { name: 'requiresEvidence', kind: 'switch', required: false },
  {
    name: 'evidence',
    kind: 'file',
    required: true,
    visibleWhen: values => values.requiresEvidence,
  },
  { name: 'richBrief', kind: 'rich-text', required: true },
  { name: 'notes', kind: 'textarea', required: false },
]

export function getVisibleSchemaFields(values: SchemaDrivenValues): readonly SchemaDrivenField[] {
  return SCHEMA_DRIVEN_FIELDS.filter(field => !field.visibleWhen || field.visibleWhen(values))
}

export function getSubmittableSchemaFields(
  values: SchemaDrivenValues,
  access: SchemaFieldAccess,
): readonly SchemaDrivenField[] {
  // AI modified: submission projection enforces field access after visibility is resolved.
  return getVisibleSchemaFields(values).filter(
    field => field.permission !== 'sensitive-write' || access.canWriteSensitiveFields,
  )
}
