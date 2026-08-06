import type {
  FormWorkbenchSubmitInput,
  FormWorkbenchValues,
  WorkbenchCategory,
  WorkbenchProvince,
} from './types'

export const WORKBENCH_CITIES: Readonly<Record<WorkbenchProvince, readonly string[]>> = {
  zhejiang: ['hangzhou', 'ningbo'],
  jiangsu: ['nanjing', 'suzhou'],
  shanghai: ['shanghai'],
}

export const FORM_WORKBENCH_STEP_FIELDS: readonly (readonly (keyof FormWorkbenchValues)[])[] = [
  ['title', 'budget', 'category', 'reviewers', 'province', 'city', 'publishAt', 'address'],
  ['activeRange', 'richContent', 'markdown'],
  [],
]

export function getWorkbenchCities(province: FormWorkbenchValues['province']): readonly string[] {
  return province ? WORKBENCH_CITIES[province] : []
}

export function getLinkedBudget(category: WorkbenchCategory, currentBudget: number): number {
  // AI modified: internal requests are non-billable, while other categories preserve the operator input.
  return category === 'internal' ? 0 : currentBudget
}

export function getValidWorkbenchCity(
  province: FormWorkbenchValues['province'],
  currentCity: string,
): string {
  return getWorkbenchCities(province).includes(currentCity) ? currentCity : ''
}

export function getWorkbenchSubmission(
  values: FormWorkbenchValues,
  attachmentNames: readonly string[],
  imageNames: readonly string[],
): FormWorkbenchSubmitInput {
  return {
    ...values,
    reviewers: [...values.reviewers],
    activeRange: values.activeRange ? { ...values.activeRange } : null,
    attachmentNames: [...attachmentNames],
    imageNames: [...imageNames],
  }
}

export function getFormWorkbenchFingerprint(submission: FormWorkbenchSubmitInput): string {
  return JSON.stringify(submission)
}

export function shouldConfirmWorkbenchLeave(
  currentFingerprint: string,
  committedFingerprint: string,
  isSubmitting: boolean,
): boolean {
  return !isSubmitting && currentFingerprint !== committedFingerprint
}
