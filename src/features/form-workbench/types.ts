import type { DateRangeValue } from '@/components/admin'

export const WORKBENCH_CATEGORIES = ['internal', 'customer', 'compliance'] as const
export const WORKBENCH_REVIEWERS = ['operations', 'security', 'content'] as const
export const WORKBENCH_PROVINCES = ['zhejiang', 'jiangsu', 'shanghai'] as const

export type WorkbenchCategory = (typeof WORKBENCH_CATEGORIES)[number]
export type WorkbenchReviewer = (typeof WORKBENCH_REVIEWERS)[number]
export type WorkbenchProvince = (typeof WORKBENCH_PROVINCES)[number]

export interface FormWorkbenchValues {
  title: string
  budget: number
  category: WorkbenchCategory
  reviewers: WorkbenchReviewer[]
  province: WorkbenchProvince | ''
  city: string
  publishAt: string
  activeRange: DateRangeValue | null
  richContent: string
  markdown: string
  address: string
}

export type FormWorkbenchErrors = Partial<Record<keyof FormWorkbenchValues, string>>

export interface FormWorkbenchSubmitInput extends FormWorkbenchValues {
  attachmentNames: string[]
  imageNames: string[]
}

export interface FormWorkbenchSaveResponse {
  id: string
  submittedAt: string
}

export interface TitleAvailabilityResponse {
  title: string
  isAvailable: boolean
}

export interface FormWorkbenchDraft {
  version: 3
  schemaId: 'form-workbench'
  principalId: string
  savedAt: string
  values: FormWorkbenchValues
  attachmentNames: string[]
  imageNames: string[]
}

export type DynamicWorkbenchFieldName = 'title' | 'budget' | 'category'

export interface DynamicWorkbenchOption {
  labelKey: string
  value: string
}

export interface DynamicWorkbenchField {
  name: DynamicWorkbenchFieldName
  kind: 'text' | 'number' | 'select'
  labelKey: string
  placeholderKey?: string
  min?: number
  options?: readonly DynamicWorkbenchOption[]
}

export const DEFAULT_FORM_WORKBENCH_VALUES: FormWorkbenchValues = {
  title: '',
  budget: 0,
  category: 'internal',
  reviewers: [],
  province: '',
  city: '',
  publishAt: '',
  activeRange: null,
  richContent: '',
  markdown: '',
  address: '',
}

// AI modified: a typed field contract drives the basic controls while domain-heavy controls stay explicit.
export const FORM_WORKBENCH_FIELDS: readonly DynamicWorkbenchField[] = [
  {
    name: 'title',
    kind: 'text',
    labelKey: 'formWorkbench.fields.title',
    placeholderKey: 'formWorkbench.fields.titlePlaceholder',
  },
  {
    name: 'budget',
    kind: 'number',
    labelKey: 'formWorkbench.fields.budget',
    min: 0,
  },
  {
    name: 'category',
    kind: 'select',
    labelKey: 'formWorkbench.fields.category',
    options: WORKBENCH_CATEGORIES.map((category) => ({
      labelKey: `formWorkbench.categories.${category}`,
      value: category,
    })),
  },
]
