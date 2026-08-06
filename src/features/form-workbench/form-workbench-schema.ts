import type { FormWorkbenchValues } from './types'
import { z } from 'zod'
import { WORKBENCH_CATEGORIES, WORKBENCH_PROVINCES, WORKBENCH_REVIEWERS } from './types'

export type FormWorkbenchTranslate = (key: string) => string

export function hasRichTextContent(html: string): boolean {
  return (
    html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim().length > 0
  )
}

export function getFormWorkbenchSchema(t: FormWorkbenchTranslate) {
  return z
    .object({
      title: z.string().trim().min(3, t('formWorkbench.validation.titleLength')),
      budget: z.coerce.number().min(0, t('formWorkbench.validation.budgetMinimum')),
      category: z.enum(WORKBENCH_CATEGORIES),
      reviewers: z.array(z.enum(WORKBENCH_REVIEWERS)),
      province: z.union([z.enum(WORKBENCH_PROVINCES), z.literal('')]),
      city: z.string(),
      publishAt: z.string().min(1, t('formWorkbench.validation.publishAtRequired')),
      activeRange: z
        .object({
          start: z.string().min(1),
          end: z.string().min(1),
        })
        .nullable(),
      richContent: z
        .string()
        .refine(hasRichTextContent, t('formWorkbench.validation.richContentRequired')),
      markdown: z.string().trim().min(10, t('formWorkbench.validation.markdownLength')),
      address: z.string().trim().min(5, t('formWorkbench.validation.addressLength')),
    })
    .superRefine((values, context) => {
      if (values.category !== 'internal' && values.reviewers.length === 0) {
        context.addIssue({
          code: 'custom',
          path: ['reviewers'],
          message: t('formWorkbench.validation.reviewerRequired'),
        })
      }
      if (!values.province) {
        context.addIssue({
          code: 'custom',
          path: ['province'],
          message: t('formWorkbench.validation.provinceRequired'),
        })
      }
      if (!values.city) {
        context.addIssue({
          code: 'custom',
          path: ['city'],
          message: t('formWorkbench.validation.cityRequired'),
        })
      }
      if (!values.activeRange || values.activeRange.start > values.activeRange.end) {
        context.addIssue({
          code: 'custom',
          path: ['activeRange'],
          message: t('formWorkbench.validation.activeRangeRequired'),
        })
      }
    }) satisfies z.ZodType<FormWorkbenchValues>
}
