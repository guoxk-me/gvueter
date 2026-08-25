export interface RequestAccessFailure {
  status: 401 | 403
  code: string
  message: string
  requestUrl?: string
  requestId?: string
}

export type RequestAccessFailureHandler = (failure: RequestAccessFailure) => void | Promise<void>

const sessionInvalidationHandlers = new Map<string, RequestAccessFailureHandler>()
const forbiddenHandlers = new Map<string, RequestAccessFailureHandler>()

let hasInvalidatedSession = false
let sessionInvalidationTask: Promise<void> | null = null

function registerAccessFailureHandler(
  handlers: Map<string, RequestAccessFailureHandler>,
  key: string,
  handler: RequestAccessFailureHandler,
): () => void {
  handlers.set(key, handler)
  return () => {
    if (handlers.get(key) === handler) {
      handlers.delete(key)
    }
  }
}

export function registerSessionInvalidationHandler(
  key: string,
  handler: RequestAccessFailureHandler,
): () => void {
  return registerAccessFailureHandler(sessionInvalidationHandlers, key, handler)
}

export function registerForbiddenHandler(
  key: string,
  handler: RequestAccessFailureHandler,
): () => void {
  return registerAccessFailureHandler(forbiddenHandlers, key, handler)
}

export function resetSessionInvalidation(): void {
  hasInvalidatedSession = false
  sessionInvalidationTask = null
}

export async function notifySessionInvalidated(failure: RequestAccessFailure): Promise<void> {
  if (hasInvalidatedSession) {
    await sessionInvalidationTask
    return
  }

  // AI modified: latch the notification until a new token is installed so concurrent 401s clear once.
  hasInvalidatedSession = true
  sessionInvalidationTask = Promise.allSettled(
    [...sessionInvalidationHandlers.values()].map(handler => handler(failure)),
  ).then(() => undefined)

  await sessionInvalidationTask
}

export async function notifyForbidden(failure: RequestAccessFailure): Promise<void> {
  await Promise.allSettled([...forbiddenHandlers.values()].map(handler => handler(failure)))
}
