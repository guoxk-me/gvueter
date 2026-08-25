import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent } from 'vue'
import {
  FRONTEND_ERROR_EVENT,
  getRedactedDiagnosticText,
  installGlobalErrorHandling,
  registerFrontendErrorReporter,
  reportFrontendError,
} from '@/lib/observability'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('frontend observability boundary', () => {
  it('redacts credentials and personal email addresses before reporters receive diagnostics', () => {
    const failure = new Error(
      'Request failed for owner@example.com?access_token=secret-token&password=hunter2',
    )
    failure.stack = 'Authorization: Bearer abc.def.ghi contact=owner@example.com api_key=key-123'

    const record = reportFrontendError('vue', failure)
    const serializedRecord = JSON.stringify(record)

    // AI modified: regression coverage verifies redaction at the exported record boundary.
    expect(serializedRecord).not.toContain('owner@example.com')
    expect(serializedRecord).not.toContain('secret-token')
    expect(serializedRecord).not.toContain('hunter2')
    expect(serializedRecord).not.toContain('abc.def.ghi')
    expect(serializedRecord).not.toContain('key-123')
    expect(serializedRecord).toContain('[redacted')
    expect(getRedactedDiagnosticText('safe diagnostic', 100)).toBe('safe diagnostic')
  })

  it('reports bounded diagnostics through both registered and browser extension points', () => {
    const report = vi.fn()
    const browserRecords: unknown[] = []
    const unregister = registerFrontendErrorReporter('observability-spec', { report })
    const browserHandler = (event: Event): void => {
      browserRecords.push((event as CustomEvent).detail)
    }
    window.addEventListener(FRONTEND_ERROR_EVENT, browserHandler)

    try {
      const record = reportFrontendError('vue', new Error('Render failed'), {
        componentName: 'AuditPanel',
        lifecycleInfo: 'render function',
      })

      expect(record).toMatchObject({
        source: 'vue',
        name: 'Error',
        message: 'Render failed',
        componentName: 'AuditPanel',
        lifecycleInfo: 'render function',
      })
      expect(report).toHaveBeenCalledWith(record)
      expect(browserRecords).toEqual([record])
      expect(record).not.toHaveProperty('componentState')
    }
    finally {
      unregister()
      window.removeEventListener(FRONTEND_ERROR_EVENT, browserHandler)
    }
  })

  it('captures Vue failures and restores the previous application handler', () => {
    const app = createApp(defineComponent({ template: '<div />' }))
    const previousHandler = vi.fn()
    const report = vi.fn()
    app.config.errorHandler = previousHandler
    const unregisterReporter = registerFrontendErrorReporter('vue-error-spec', { report })
    const uninstall = installGlobalErrorHandling(app)

    app.config.errorHandler?.(new Error('Component failed'), null, 'setup function')

    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'vue',
        message: 'Component failed',
        lifecycleInfo: 'setup function',
      }),
    )
    expect(previousHandler).toHaveBeenCalledOnce()

    uninstall()
    expect(app.config.errorHandler).toBe(previousHandler)
    unregisterReporter()
  })

  it('captures unhandled Promise rejections without suppressing the browser event', () => {
    const app = createApp(defineComponent({ template: '<div />' }))
    const report = vi.fn()
    const unregisterReporter = registerFrontendErrorReporter('promise-error-spec', { report })
    const uninstall = installGlobalErrorHandling(app)
    const rejection = new Event('unhandledrejection') as PromiseRejectionEvent
    Object.defineProperty(rejection, 'reason', { value: new Error('Background task failed') })

    window.dispatchEvent(rejection)

    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'unhandled-promise',
        message: 'Background task failed',
      }),
    )
    expect(rejection.defaultPrevented).toBe(false)

    uninstall()
    unregisterReporter()
  })
})
