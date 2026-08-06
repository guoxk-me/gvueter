export type SessionBoundaryReason = 'principal-changed' | 'session-ended'

export interface SessionPrincipalChange {
  previousPrincipalId: string | null
  principalId: string | null
  reason: SessionBoundaryReason
}

export type SessionBoundaryHandler = (change: SessionPrincipalChange) => void

const sessionBoundaryHandlers = new Map<string, SessionBoundaryHandler>()

export function registerSessionBoundaryHandler(
  key: string,
  handler: SessionBoundaryHandler,
): () => void {
  sessionBoundaryHandlers.set(key, handler)
  return () => {
    if (sessionBoundaryHandlers.get(key) === handler) sessionBoundaryHandlers.delete(key)
  }
}

export function notifySessionPrincipalChanged(change: SessionPrincipalChange): void {
  // AI modified: one framework-neutral boundary prevents auth from importing feature stores.
  for (const handler of Array.from(sessionBoundaryHandlers.values())) {
    try {
      handler(change)
    } catch {
      // AI modified: one failed projection cannot prevent the remaining principal cleanup handlers.
    }
  }
}
