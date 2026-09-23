import type { RuntimeConfigErrorCode } from '@/config/runtime-config'
import { readonly, shallowRef } from 'vue'
import { reportFrontendError } from '@/lib/observability'

export const APPLICATION_FAILURE_KINDS = [
  'vue-runtime',
  'asset-preload',
  'navigation',
  'bootstrap',
] as const

export type ApplicationFailureKind = (typeof APPLICATION_FAILURE_KINDS)[number]
type ReportedApplicationFailureKind = Exclude<ApplicationFailureKind, 'vue-runtime'>

export interface ApplicationFailure {
  kind: ApplicationFailureKind
  occurredAt: string
  routeName?: string
}

interface ApplicationFailureContext {
  routeName?: string
}

const activeApplicationFailure = shallowRef<ApplicationFailure>()
let reportedFailures = new WeakSet<object>()

export const applicationFailure = readonly(activeApplicationFailure)

function isWeakReferenceCandidate(failure: unknown): failure is object {
  return (typeof failure === 'object' && failure !== null) || typeof failure === 'function'
}

function getSafeRouteName(routeName: string | undefined): string | undefined {
  return routeName?.slice(0, 160) || undefined
}

export function setApplicationFailure(
  kind: ApplicationFailureKind,
  context: ApplicationFailureContext = {},
): Readonly<ApplicationFailure> {
  const routeName = getSafeRouteName(context.routeName)
  const currentFailure = activeApplicationFailure.value

  if (currentFailure) {
    if (!currentFailure.routeName && routeName) {
      const failureWithRoute = { ...currentFailure, routeName }
      activeApplicationFailure.value = failureWithRoute
      return failureWithRoute
    }
    return currentFailure
  }

  // AI modified: the visible recovery state stores only safe classification, never the raw failure or URL.
  activeApplicationFailure.value = {
    kind,
    occurredAt: new Date().toISOString(),
    routeName,
  }
  return activeApplicationFailure.value
}

export function reportApplicationFailure(
  kind: ReportedApplicationFailureKind,
  failure: unknown,
  context: ApplicationFailureContext = {},
  target: Window = window,
): Readonly<ApplicationFailure> {
  const visibleFailure = setApplicationFailure(kind, context)
  const hasBeenReported = isWeakReferenceCandidate(failure) && reportedFailures.has(failure)

  if (!hasBeenReported) {
    if (isWeakReferenceCandidate(failure))
      reportedFailures.add(failure)

    const source = kind === 'asset-preload' ? 'vite-preload' : kind
    reportFrontendError(
      source,
      failure,
      context.routeName
        ? { lifecycleInfo: `route navigation: ${getSafeRouteName(context.routeName)}` }
        : {},
      target,
    )
  }

  return visibleFailure
}

export function clearApplicationFailure(): void {
  activeApplicationFailure.value = undefined
  reportedFailures = new WeakSet<object>()
}

export function installApplicationPreloadRecovery(target: Window = window): () => void {
  const preloadFailureHandler = (event: VitePreloadErrorEvent): void => {
    // AI modified: Vite must not rethrow a stale-chunk failure after the recovery screen takes ownership.
    event.preventDefault()
    reportApplicationFailure('asset-preload', event.payload, {}, target)
  }

  target.addEventListener('vite:preloadError', preloadFailureHandler)
  return () => target.removeEventListener('vite:preloadError', preloadFailureHandler)
}

export function showBootstrapRecovery(
  target: Document = document,
  reloadApplication: () => void = () => window.location.reload(),
): void {
  const mountTarget = target.getElementById('app')
  if (!mountTarget)
    return

  const isChinese = target.documentElement.lang.toLowerCase().startsWith('zh')
  const copy = isChinese
    ? {
        title: '应用启动失败',
        description: '应用暂时无法启动。请刷新应用；未保存的更改可能会丢失。',
        action: '刷新应用',
      }
    : {
        title: 'Application failed to start',
        description:
          'The application could not start. Reload the application; unsaved changes may be lost.',
        action: 'Reload application',
      }

  const panel = target.createElement('main')
  panel.className = 'flex min-h-svh items-center justify-center bg-background px-6 py-12'
  panel.dataset.applicationRecovery = 'bootstrap'
  panel.setAttribute('role', 'alert')
  panel.setAttribute('aria-live', 'assertive')

  const content = target.createElement('div')
  content.className
    = 'flex w-full max-w-lg flex-col items-center rounded-xl border border-destructive/35 bg-destructive/5 px-5 py-8 text-center'

  const title = target.createElement('h1')
  title.className = 'text-xl font-semibold text-foreground'
  title.textContent = copy.title

  const description = target.createElement('p')
  description.className = 'mt-2 max-w-md text-sm text-muted-foreground'
  description.textContent = copy.description

  const reloadButton = target.createElement('button')
  reloadButton.className
    = 'mt-5 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
  reloadButton.type = 'button'
  reloadButton.textContent = copy.action
  reloadButton.addEventListener('click', reloadApplication)

  // AI modified: bootstrap recovery uses DOM APIs so it remains available when Vue or a plugin cannot mount.
  content.append(title, description, reloadButton)
  panel.append(content)
  mountTarget.replaceChildren(panel)
  reloadButton.focus()
}

interface RuntimeConfigRecoveryDetails {
  code: RuntimeConfigErrorCode
  configPath: string
  traceId: string
}

export function showRuntimeConfigRecovery(
  details: RuntimeConfigRecoveryDetails,
  retry: () => Promise<void>,
  target: Document = document,
): void {
  const mountTarget = target.getElementById('app')
  if (!mountTarget)
    return

  const isChinese = (target.defaultView?.navigator.language ?? target.documentElement.lang)
    .toLowerCase()
    .startsWith('zh')
  const copy = isChinese
    ? {
        title: '运行配置不可用',
        description: '应用尚未启动。请检查部署配置后重试。',
        action: '重新加载配置',
        pending: '正在重新加载…',
        failed: '配置仍然不可用，请联系部署管理员。',
      }
    : {
        title: 'Runtime configuration unavailable',
        description: 'The application has not started. Check the deployment configuration and retry.',
        action: 'Reload configuration',
        pending: 'Reloading configuration…',
        failed: 'Configuration is still unavailable. Contact the deployment administrator.',
      }

  const panel = target.createElement('main')
  panel.className = 'flex min-h-svh items-center justify-center bg-background px-6 py-12'
  panel.dataset.applicationRecovery = 'runtime-config'
  panel.setAttribute('role', 'alert')
  panel.setAttribute('aria-live', 'assertive')

  const content = target.createElement('div')
  content.className
    = 'flex w-full max-w-lg flex-col items-center rounded-xl border border-destructive/35 bg-destructive/5 px-5 py-8 text-center'

  const title = target.createElement('h1')
  title.className = 'text-xl font-semibold text-foreground'
  title.textContent = copy.title

  const description = target.createElement('p')
  description.className = 'mt-2 max-w-md text-sm text-muted-foreground'
  description.textContent = copy.description

  const diagnostics = target.createElement('dl')
  diagnostics.className = 'mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-left text-xs text-muted-foreground'
  for (const [label, diagnostic] of [
    ['Code', details.code],
    ['Phase', 'runtime-config'],
    ['Path', details.configPath],
    ['Trace', details.traceId],
  ] as const) {
    const term = target.createElement('dt')
    term.className = 'font-medium text-foreground'
    term.textContent = label
    const value = target.createElement('dd')
    value.className = 'min-w-0 break-all font-mono'
    value.textContent = diagnostic
    diagnostics.append(term, value)
  }

  const status = target.createElement('p')
  status.className = 'mt-3 min-h-5 text-xs text-muted-foreground'
  status.setAttribute('role', 'status')

  const retryButton = target.createElement('button')
  retryButton.className
    = 'mt-3 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60'
  retryButton.type = 'button'
  retryButton.textContent = copy.action
  retryButton.addEventListener('click', () => {
    retryButton.disabled = true
    status.textContent = copy.pending
    void retry().catch(() => {
      retryButton.disabled = false
      status.textContent = copy.failed
      retryButton.focus()
    })
  })

  // AI modified: config recovery remains usable before Vue, Pinia, Router, or i18n can initialize.
  content.append(title, description, diagnostics, status, retryButton)
  panel.append(content)
  mountTarget.replaceChildren(panel)
  retryButton.focus()
}
