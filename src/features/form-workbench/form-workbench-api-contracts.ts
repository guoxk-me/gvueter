import type {
  FormWorkbenchSaveResponse,
  FormWorkbenchSubmitInput,
  TitleAvailabilityResponse,
} from '@/features/form-workbench/types'
import { z } from 'zod'
import { hasRichTextContent } from '@/features/form-workbench/form-workbench-schema'
import {
  WORKBENCH_CATEGORIES,
  WORKBENCH_PROVINCES,
  WORKBENCH_REVIEWERS,
} from '@/features/form-workbench/types'

const WORKBENCH_FILE_NAME_SCHEMA = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .refine(
    fileName =>
      !fileName.startsWith('.')
      && !fileName.endsWith('.')
      && !/[\\/]/.test(fileName)
      && ![...fileName].some(character => character.charCodeAt(0) < 32),
  )

// AI modified: submissions repeat bounded domain validation before mutable Mock state is touched.
export const FORM_WORKBENCH_SUBMIT_INPUT_SCHEMA: z.ZodType<FormWorkbenchSubmitInput> = z
  .object({
    title: z.string().trim().min(3).max(200),
    budget: z.number().finite().min(0).max(1_000_000_000_000),
    category: z.enum(WORKBENCH_CATEGORIES),
    reviewers: z.array(z.enum(WORKBENCH_REVIEWERS)).max(WORKBENCH_REVIEWERS.length),
    province: z.union([z.enum(WORKBENCH_PROVINCES), z.literal('')]),
    city: z.string().trim().max(120),
    publishAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/)
      .max(30),
    activeRange: z
      .object({
        start: z.string().date(),
        end: z.string().date(),
      })
      .strict()
      .nullable(),
    richContent: z.string().max(200_000).refine(hasRichTextContent),
    markdown: z.string().trim().min(10).max(200_000),
    address: z.string().trim().min(5).max(2_000),
    attachmentNames: z.array(WORKBENCH_FILE_NAME_SCHEMA).max(20),
    imageNames: z.array(WORKBENCH_FILE_NAME_SCHEMA).max(20),
  })
  .strict()
  .superRefine((submission, context) => {
    if (new Set(submission.reviewers).size !== submission.reviewers.length) {
      context.addIssue({
        code: 'custom',
        message: 'Reviewers must be unique',
        path: ['reviewers'],
      })
    }
    if (submission.category !== 'internal' && submission.reviewers.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'A reviewer is required',
        path: ['reviewers'],
      })
    }
    if (!submission.province || !submission.city) {
      context.addIssue({
        code: 'custom',
        message: 'Province and city are required',
        path: ['province'],
      })
    }
    if (!submission.activeRange || submission.activeRange.start > submission.activeRange.end) {
      context.addIssue({
        code: 'custom',
        message: 'The active range is invalid',
        path: ['activeRange'],
      })
    }
  })

// AI modified: workbench uniqueness and save confirmations are checked before form state commits.
export const FORM_WORKBENCH_SAVE_RESPONSE_SCHEMA: z.ZodType<FormWorkbenchSaveResponse> = z
  .object({
    id: z.string().trim().min(1).max(200),
    submittedAt: z.string().datetime({ offset: true }),
  })
  .strict()

export const TITLE_AVAILABILITY_RESPONSE_SCHEMA: z.ZodType<TitleAvailabilityResponse> = z
  .object({
    title: z.string().trim().min(1).max(200),
    isAvailable: z.boolean(),
  })
  .strict()
