import type {
  SchemaDrivenSubmissionFields,
  SchemaDrivenSubmissionResponse,
  SchemaOwnerOption,
  SchemaOwnerOptionsResponse,
} from '@/features/component-gallery/forms/schema-driven-form'
import { z } from 'zod'
import { SCHEMA_DRIVEN_EVIDENCE_MAX_FILES } from '@/features/component-gallery/forms/schema-driven-form'
import { UPLOAD_RECEIPT_SCHEMA } from '@/lib/api-contracts'

const SCHEMA_OWNER_OPTION_SCHEMA: z.ZodType<SchemaOwnerOption> = z
  .object({
    label: z.string().trim().min(1).max(200),
    value: z.string().trim().min(1).max(200),
  })
  .strict()

// AI modified: dependency-linked owner options cannot populate form controls from malformed payloads.
export const SCHEMA_OWNER_OPTIONS_RESPONSE_SCHEMA: z.ZodType<SchemaOwnerOptionsResponse> = z
  .object({
    environment: z.enum(['development', 'production', 'staging']),
    options: z.array(SCHEMA_OWNER_OPTION_SCHEMA).max(200),
  })
  .strict()

const SCHEMA_APPROVER_EMAIL_SCHEMA = z.string().trim().email().max(254)

// AI modified: the multipart JSON part remains a closed DTO even though evidence bytes use separate parts.
export const SCHEMA_DRIVEN_SUBMISSION_FIELDS_SCHEMA: z.ZodType<SchemaDrivenSubmissionFields> = z
  .object({
    requestName: z.string().trim().min(3).max(200),
    environment: z.enum(['development', 'production', 'staging']),
    serviceOwner: z.string().trim().min(1).max(200),
    approverEmail: SCHEMA_APPROVER_EMAIL_SCHEMA.optional(),
    urgency: z.enum(['normal', 'urgent']),
    requiresEvidence: z.boolean(),
    richBrief: z
      .string()
      .max(200_000)
      .refine(html => Boolean(html.replace(/<[^>]+>/g, '').trim())),
    notes: z.string().max(20_000),
  })
  .strict()
  .superRefine((submission, context) => {
    if (submission.environment !== 'production' && submission.approverEmail) {
      context.addIssue({
        code: 'custom',
        message: 'The approver is only accepted for production submissions.',
        path: ['approverEmail'],
      })
    }
  })

// AI modified: success requires server-owned upload receipts, not a client-provided file-name list.
export const SCHEMA_DRIVEN_SUBMISSION_RESPONSE_SCHEMA: z.ZodType<SchemaDrivenSubmissionResponse> = z
  .object({
    submissionId: z.string().trim().min(1).max(200),
    submittedAt: z.string().datetime({ offset: true }),
    evidence: z.array(UPLOAD_RECEIPT_SCHEMA).max(SCHEMA_DRIVEN_EVIDENCE_MAX_FILES),
  })
  .strict()
