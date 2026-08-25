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
        description: '管理后台暂时无法启动。请刷新应用；未保存的更改可能会丢失。',
        action: '刷新应用',
      }
    : {
        title: 'Application failed to start',
        description:
          'The admin application could not start. Reload the application; unsaved changes may be lost.',
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
