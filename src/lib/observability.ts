import type { App, ComponentPublicInstance } from 'vue'

// AI modified: monitoring adapters subscribe to a product-neutral event after admin removal.
export const FRONTEND_ERROR_EVENT = 'gvueter:frontend-error'

export type FrontendErrorSource
  = | 'vue'
    | 'unhandled-promise'
    | 'navigation'
    | 'vite-preload'
    | 'bootstrap'

export interface FrontendErrorRecord {
  source: FrontendErrorSource
  name: string
  message: string
  stack?: string
  componentName?: string
  lifecycleInfo?: string
  occurredAt: string
}

export interface FrontendErrorReporter {
  report: (record: Readonly<FrontendErrorRecord>) => Promise<void> | void
}

const reporters = new Map<string, FrontendErrorReporter>()

const SECRET_ASSIGNMENT_PATTERN
  = /(\b(?:access[_-]?token|refresh[_-]?token|token|password|secret|api[_-]?key|authorization)["']?[ \t]*[:=][ \t]*["']?)([^\s&,}"']+)/gi
const BEARER_CREDENTIAL_PATTERN = /\b(Bearer[ \t]+)[\w.~+/=-]+/gi
const JWT_PATTERN = /\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g
const EMAIL_PATTERN = /\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/gi

export function getRedactedDiagnosticText(text: string, maximumLength: number): string {
  // AI modified: monitoring records redact common credentials and personal email addresses before export.
  return text
    .slice(0, maximumLength * 4)
    .replace(BEARER_CREDENTIAL_PATTERN, '$1[redacted]')
    .replace(JWT_PATTERN, '[redacted-token]')
    .replace(SECRET_ASSIGNMENT_PATTERN, '$1[redacted]')
    .replace(EMAIL_PATTERN, '[redacted-email]')
    .slice(0, maximumLength)
}

function getErrorRecord(
  source: FrontendErrorSource,
  failure: unknown,
  context: Pick<FrontendErrorRecord, 'componentName' | 'lifecycleInfo'> = {},
): FrontendErrorRecord {
  const error
    = failure instanceof Error
      ? failure
      : new Error(typeof failure === 'string' ? failure : 'Unknown frontend failure')

  // AI modified: reporters receive bounded diagnostics only, never component state or request payloads.
  return {
    source,
    name: getRedactedDiagnosticText(error.name, 120),
    message: getRedactedDiagnosticText(error.message, 1_000),
    stack: error.stack ? getRedactedDiagnosticText(error.stack, 8_000) : undefined,
    componentName: context.componentName
      ? getRedactedDiagnosticText(context.componentName, 160)
      : undefined,
    lifecycleInfo: context.lifecycleInfo
      ? getRedactedDiagnosticText(context.lifecycleInfo, 240)
      : undefined,
    occurredAt: new Date().toISOString(),
  }
}

function notifyErrorReporters(record: FrontendErrorRecord, target: Window): void {
  for (const reporter of reporters.values()) {
    try {
      const reportTask = reporter.report(record)
      if (reportTask instanceof Promise)
        void reportTask.catch(() => undefined)
    }
    catch {
      // A reporting integration must never replace the original application failure.
    }
  }

  // AI modified: external monitoring adapters can subscribe without coupling application bootstrap to a vendor SDK.
  target.dispatchEvent(
    new CustomEvent<FrontendErrorRecord>(FRONTEND_ERROR_EVENT, {
      detail: record,
    }),
  )
}

function getComponentName(instance: ComponentPublicInstance | null): string | undefined {
  const componentName = instance?.$options.name
  return typeof componentName === 'string' && componentName ? componentName : undefined
}

export function registerFrontendErrorReporter(
  key: string,
  reporter: FrontendErrorReporter,
): () => void {
  reporters.set(key, reporter)
  return () => {
    if (reporters.get(key) === reporter)
      reporters.delete(key)
  }
}

export function reportFrontendError(
  source: FrontendErrorSource,
  failure: unknown,
  context: Pick<FrontendErrorRecord, 'componentName' | 'lifecycleInfo'> = {},
  target: Window = window,
): FrontendErrorRecord {
  const record = getErrorRecord(source, failure, context)
  notifyErrorReporters(record, target)
  return record
}

export function reportVueError(
  failure: unknown,
  instance: ComponentPublicInstance | null,
  lifecycleInfo: string,
  target: Window = window,
): FrontendErrorRecord {
  return reportFrontendError(
    'vue',
    failure,
    {
      componentName: getComponentName(instance),
      lifecycleInfo,
    },
    target,
  )
}

export function installGlobalErrorHandling(app: App, target: Window = window): () => void {
  const previousVueErrorHandler = app.config.errorHandler
  const promiseFailureHandler = (event: PromiseRejectionEvent): void => {
    reportFrontendError('unhandled-promise', event.reason, {}, target)
  }

  app.config.errorHandler = (failure, instance, lifecycleInfo) => {
    reportVueError(failure, instance, lifecycleInfo, target)

    if (previousVueErrorHandler) {
      previousVueErrorHandler(failure, instance, lifecycleInfo)
      return
    }

    if (typeof globalThis.reportError === 'function')
      globalThis.reportError(failure)
  }

  target.addEventListener('unhandledrejection', promiseFailureHandler)

  return () => {
    app.config.errorHandler = previousVueErrorHandler
    target.removeEventListener('unhandledrejection', promiseFailureHandler)
  }
}
