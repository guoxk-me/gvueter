import type { NotificationRealtimeEvent } from './types'
import { NOTIFICATION_REALTIME_EVENT_SCHEMA } from './notification-api-contracts'

const MAX_SEEN_EVENT_IDS = 500

export type NotificationEventListener = (event: NotificationRealtimeEvent) => void

export interface NotificationTransport {
  start: (listener: NotificationEventListener) => void
  stop: () => void
}

export interface InMemoryNotificationTransport extends NotificationTransport {
  publish: (event: NotificationRealtimeEvent) => void
}

function rememberEvent(eventId: string, seenEventIds: Set<string>): boolean {
  if (seenEventIds.has(eventId))
    return false

  seenEventIds.add(eventId)
  if (seenEventIds.size > MAX_SEEN_EVENT_IDS) {
    const oldestEventId = seenEventIds.values().next().value
    if (oldestEventId)
      seenEventIds.delete(oldestEventId)
  }
  return true
}

export interface WebSocketNotificationTransportOptions {
  baseReconnectDelayMs?: number
  maxReconnectDelayMs?: number
  baseUrl?: string
  allowedOrigins?: ReadonlySet<string>
  socketFactory?: (url: string) => WebSocket
  scheduleReconnect?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  cancelReconnect?: (handle: ReturnType<typeof setTimeout>) => void
}

export function getNotificationWebSocketAllowedOrigins(
  originEntries: readonly string[],
): ReadonlySet<string> {
  const allowedOrigins = new Set<string>()

  for (const originEntry of originEntries) {
    try {
      const originUrl = new URL(originEntry.trim())
      // AI modified: bearer-authenticated cross-origin sockets require an explicit secure origin.
      if (originUrl.protocol === 'wss:' && !originUrl.username && !originUrl.password)
        allowedOrigins.add(originUrl.origin)
    }
    catch {
      // Invalid deployment entries are ignored instead of weakening the trust boundary.
    }
  }

  return allowedOrigins
}

export function isTrustedNotificationWebSocketUrl(
  requestedUrl: string,
  options: Pick<WebSocketNotificationTransportOptions, 'allowedOrigins' | 'baseUrl'> = {},
): boolean {
  let targetUrl: URL
  try {
    targetUrl = new URL(requestedUrl)
  }
  catch {
    return false
  }

  if (
    (targetUrl.protocol !== 'wss:' && targetUrl.protocol !== 'ws:')
    || targetUrl.username
    || targetUrl.password
  ) {
    return false
  }

  const baseUrl
    = options.baseUrl ?? (typeof window === 'undefined' ? undefined : window.location.href)
  let sameOriginSocket = false
  if (baseUrl) {
    try {
      const pageUrl = new URL(baseUrl)
      if (pageUrl.protocol !== 'https:' && pageUrl.protocol !== 'http:')
        return false
      const socketProtocol = pageUrl.protocol === 'https:' ? 'wss:' : 'ws:'
      sameOriginSocket = targetUrl.origin === `${socketProtocol}//${pageUrl.host}`
    }
    catch {
      return false
    }
  }

  if (sameOriginSocket)
    return true
  if (targetUrl.protocol !== 'wss:')
    return false
  return options.allowedOrigins?.has(targetUrl.origin) ?? false
}

function getNotificationEvent(rawMessage: unknown): NotificationRealtimeEvent | undefined {
  if (typeof rawMessage !== 'string')
    return undefined

  try {
    const message: unknown = JSON.parse(rawMessage)
    // AI modified: realtime events use the same strict notification contract as HTTP responses.
    const event = NOTIFICATION_REALTIME_EVENT_SCHEMA.safeParse(message)
    return event.success ? event.data : undefined
  }
  catch {
    return undefined
  }
}

export function createInMemoryNotificationTransport(
  initialEvents: readonly NotificationRealtimeEvent[] = [],
): InMemoryNotificationTransport {
  let listener: NotificationEventListener | undefined
  const seenEventIds = new Set<string>()

  function publish(event: NotificationRealtimeEvent): void {
    if (!listener || !rememberEvent(event.eventId, seenEventIds))
      return

    listener(event)
  }

  return {
    start(nextListener) {
      listener = nextListener
      seenEventIds.clear()
      initialEvents.forEach(publish)
    },
    stop() {
      listener = undefined
    },
    publish,
  }
}

export function createWebSocketNotificationTransport(
  url: string,
  tokenProvider: () => string | null,
  options: WebSocketNotificationTransportOptions = {},
): NotificationTransport {
  if (!isTrustedNotificationWebSocketUrl(url, options)) {
    throw new Error('Notification WebSocket URL is not trusted')
  }

  const baseReconnectDelayMs = options.baseReconnectDelayMs ?? 1_000
  const maxReconnectDelayMs = options.maxReconnectDelayMs ?? 30_000
  const socketFactory = options.socketFactory ?? (socketUrl => new WebSocket(socketUrl))
  const scheduleReconnect
    = options.scheduleReconnect ?? ((callback, delay) => setTimeout(callback, delay))
  const cancelReconnect = options.cancelReconnect ?? (handle => clearTimeout(handle))
  const seenEventIds = new Set<string>()
  let listener: NotificationEventListener | undefined
  let socket: WebSocket | undefined
  let reconnectHandle: ReturnType<typeof setTimeout> | undefined
  let reconnectAttempt = 0
  let isRunning = false

  function clearReconnect(): void {
    if (reconnectHandle === undefined)
      return
    cancelReconnect(reconnectHandle)
    reconnectHandle = undefined
  }

  function scheduleNextConnection(): void {
    if (!isRunning || reconnectHandle !== undefined)
      return

    const delay = Math.min(baseReconnectDelayMs * 2 ** reconnectAttempt, maxReconnectDelayMs)
    reconnectAttempt += 1
    reconnectHandle = scheduleReconnect(() => {
      reconnectHandle = undefined
      connect()
    }, delay)
  }

  function connect(): void {
    if (!isRunning)
      return

    try {
      socket = socketFactory(url)
    }
    catch {
      scheduleNextConnection()
      return
    }

    socket.onopen = () => {
      let token: string | null = null
      try {
        token = tokenProvider()
      }
      catch {
        socket?.close()
        return
      }
      if (token) {
        // AI modified: authenticate after opening so credentials never appear in the WebSocket URL.
        socket?.send(JSON.stringify({ type: 'authenticate', token }))
      }
    }
    socket.onmessage = (messageEvent) => {
      const notificationEvent = getNotificationEvent(messageEvent.data)
      if (!notificationEvent || !rememberEvent(notificationEvent.eventId, seenEventIds))
        return

      // AI modified: a valid event proves the connection is healthy and resets reconnect backoff.
      reconnectAttempt = 0
      listener?.(notificationEvent)
    }
    socket.onerror = () => socket?.close()
    socket.onclose = () => {
      socket = undefined
      scheduleNextConnection()
    }
  }

  return {
    start(nextListener) {
      if (isRunning)
        return

      isRunning = true
      listener = nextListener
      seenEventIds.clear()
      connect()
    },
    stop() {
      isRunning = false
      listener = undefined
      clearReconnect()
      if (socket) {
        const activeSocket = socket
        socket = undefined
        activeSocket.onclose = null
        activeSocket.close()
      }
    },
  }
}

export function createRuntimeNotificationTransport(
  tokenProvider: () => string | null,
  runtimeConfig: {
    readonly url: string | null
    readonly allowedOrigins: readonly string[]
  },
): NotificationTransport {
  const websocketUrl = runtimeConfig.url?.trim()
  // AI modified: local/MSW environments stay deterministic unless a WebSocket URL is explicitly configured.
  if (!websocketUrl)
    return createInMemoryNotificationTransport()

  const allowedOrigins = getNotificationWebSocketAllowedOrigins(
    runtimeConfig.allowedOrigins,
  )
  // AI modified: a misconfigured socket fails closed before any bearer credential can be sent.
  return isTrustedNotificationWebSocketUrl(websocketUrl, { allowedOrigins })
    ? createWebSocketNotificationTransport(websocketUrl, tokenProvider, { allowedOrigins })
    : createInMemoryNotificationTransport()
}
