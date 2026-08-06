import { nextTick } from 'vue'

const INVALID_OWNER_SELECTOR = '[aria-invalid="true"]'
const FOCUSABLE_CONTROL_SELECTOR = [
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'button:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export function focusFirstInvalidControl(formElement: HTMLFormElement | null): void {
  const invalidOwner = formElement?.querySelector<HTMLElement>(INVALID_OWNER_SELECTOR)
  if (!invalidOwner) return

  // AI modified: composite editors expose invalid state on a group, so focus its first operable child.
  const focusTarget = invalidOwner.matches(FOCUSABLE_CONTROL_SELECTOR)
    ? invalidOwner
    : invalidOwner.querySelector<HTMLElement>(FOCUSABLE_CONTROL_SELECTOR)
  focusTarget?.focus()
}

export async function focusFirstInvalidControlAfterValidation(
  formElement: HTMLFormElement | null,
): Promise<void> {
  // AI modified: VeeValidate must render aria-invalid before the shared focus lookup runs.
  await nextTick()
  focusFirstInvalidControl(formElement)
}
