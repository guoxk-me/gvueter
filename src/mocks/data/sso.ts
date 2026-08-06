import type { SsoConfiguration } from '@/types/auth'
import {
  getBrowserStorage,
  safeStorageDiscard,
  safeStorageGet,
  safeStorageSet,
} from '@/lib/browser-storage'

interface MockSsoTicketRecord {
  userId: number
  tenantId?: string
  redirectPath: string
  expiresAt: number
}

export type MockSsoTicketConsumption =
  | ({ status: 'valid' } & MockSsoTicketRecord)
  | { status: 'expired' }
  | { status: 'invalid' }

const MOCK_SSO_PROVIDER_NAME = 'Mock Enterprise SSO'
const MOCK_SSO_TICKET_LIFETIME_MS = 60 * 1000
const MAX_MOCK_SSO_TICKETS = 100
const MOCK_SSO_TICKET_STORAGE_KEY = '__gvueter_mock_sso_tickets__'
const mockSsoTickets = new Map<string, MockSsoTicketRecord>()

let isMockSsoEnabled = true
let hasRestoredMockSsoTickets = false

function getMockSsoStorage(): Storage | undefined {
  return getBrowserStorage('session')
}

function saveMockSsoTickets(): void {
  const storage = getMockSsoStorage()
  if (mockSsoTickets.size === 0) {
    safeStorageDiscard(storage, MOCK_SSO_TICKET_STORAGE_KEY)
    return
  }

  // AI modified: the reloadable browser Mock persists only short-lived demo tickets.
  safeStorageSet(storage, MOCK_SSO_TICKET_STORAGE_KEY, JSON.stringify([...mockSsoTickets]))
}

function restoreMockSsoTickets(): void {
  if (hasRestoredMockSsoTickets) return
  hasRestoredMockSsoTickets = true
  const storage = getMockSsoStorage()
  if (!storage) return

  try {
    const storedTickets = safeStorageGet(storage, MOCK_SSO_TICKET_STORAGE_KEY)
    if (!storedTickets) return
    const ticketEntries: unknown = JSON.parse(storedTickets)
    if (!Array.isArray(ticketEntries)) throw new Error('Invalid Mock SSO ticket registry')

    for (const entry of ticketEntries) {
      if (!Array.isArray(entry) || entry.length !== 2) continue
      const [ticket, record] = entry
      if (
        typeof ticket !== 'string' ||
        !ticket.startsWith('mock-sso-ticket-') ||
        typeof record !== 'object' ||
        record === null ||
        !('userId' in record) ||
        !('redirectPath' in record) ||
        !('expiresAt' in record) ||
        typeof record.userId !== 'number' ||
        !Number.isInteger(record.userId) ||
        typeof record.redirectPath !== 'string' ||
        typeof record.expiresAt !== 'number' ||
        !Number.isFinite(record.expiresAt)
      ) {
        continue
      }
      const tenantId =
        'tenantId' in record && typeof record.tenantId === 'string' ? record.tenantId : undefined
      mockSsoTickets.set(ticket, {
        userId: record.userId,
        redirectPath: record.redirectPath,
        expiresAt: record.expiresAt,
        tenantId,
      })
    }
  } catch {
    safeStorageDiscard(storage, MOCK_SSO_TICKET_STORAGE_KEY)
  }
}

function pruneMockSsoTickets(now = Date.now()): void {
  for (const [ticket, record] of mockSsoTickets) {
    if (record.expiresAt <= now) mockSsoTickets.delete(ticket)
  }
  while (mockSsoTickets.size > MAX_MOCK_SSO_TICKETS) {
    const oldestTicket = mockSsoTickets.keys().next().value
    if (!oldestTicket) break
    mockSsoTickets.delete(oldestTicket)
  }
  saveMockSsoTickets()
}

function createMockSsoTicketValue(): string {
  const randomBytes = new Uint8Array(32)
  crypto.getRandomValues(randomBytes)
  return `mock-sso-ticket-${Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

export function getMockSsoConfiguration(): SsoConfiguration {
  return {
    isEnabled: isMockSsoEnabled,
    providerName: MOCK_SSO_PROVIDER_NAME,
  }
}

export function setMockSsoEnabled(isEnabled: boolean): void {
  isMockSsoEnabled = isEnabled
}

export function resetMockSsoConfiguration(): void {
  isMockSsoEnabled = true
}

export function issueMockSsoTicket(
  userId: number,
  redirectPath: string,
  tenantId?: string,
): string {
  restoreMockSsoTickets()
  pruneMockSsoTickets()
  const ticket = createMockSsoTicketValue()
  mockSsoTickets.set(ticket, {
    userId,
    redirectPath,
    expiresAt: Date.now() + MOCK_SSO_TICKET_LIFETIME_MS,
    tenantId,
  })
  pruneMockSsoTickets()
  return ticket
}

export function consumeMockSsoTicket(ticket: string): MockSsoTicketConsumption {
  restoreMockSsoTickets()
  const record = mockSsoTickets.get(ticket)
  if (!record) return { status: 'invalid' }

  // AI modified: deletion happens before identity lookup so every ticket is atomically one-use.
  mockSsoTickets.delete(ticket)
  saveMockSsoTickets()
  if (record.expiresAt <= Date.now()) return { status: 'expired' }
  return { status: 'valid', ...record }
}

export function resetMockSsoTickets(): void {
  mockSsoTickets.clear()
  saveMockSsoTickets()
  hasRestoredMockSsoTickets = false
}
