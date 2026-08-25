export const PAGE_STATE_KINDS = [
  'ready',
  'loading',
  'refreshing',
  'empty',
  'search-empty',
  'error',
  'fatal-error',
  'offline',
  'forbidden',
  'conflict',
  'success',
  'partial-success',
  'session-expired',
] as const

export const PAGE_STATE_RECOVERY_ACTIONS = [
  'none',
  'retry',
  'reset-search',
  'reconnect',
  'return',
  'reload',
  'review',
  'sign-in',
] as const

export type PageStateKind = (typeof PAGE_STATE_KINDS)[number]
export type PageStateRecoveryAction = (typeof PAGE_STATE_RECOVERY_ACTIONS)[number]
export type PageStateSurface = 'global-boundary' | 'page' | 'region' | 'operation'

export interface PageStateContract {
  surface: PageStateSurface
  blocksContent: boolean
  announcement: 'none' | 'polite' | 'assertive'
  recoveryActions: readonly PageStateRecoveryAction[]
}

// AI modified: one typed taxonomy separates query, connectivity, authorization, concurrency, and session recovery semantics.
export const PAGE_STATE_CONTRACTS = {
  'ready': {
    surface: 'region',
    blocksContent: false,
    announcement: 'none',
    recoveryActions: ['none'],
  },
  'loading': {
    surface: 'region',
    blocksContent: true,
    announcement: 'polite',
    recoveryActions: ['none'],
  },
  'refreshing': {
    surface: 'region',
    blocksContent: false,
    announcement: 'polite',
    recoveryActions: ['none'],
  },
  'empty': {
    surface: 'page',
    blocksContent: true,
    announcement: 'polite',
    recoveryActions: ['none'],
  },
  'search-empty': {
    surface: 'region',
    blocksContent: true,
    announcement: 'polite',
    recoveryActions: ['reset-search'],
  },
  'error': {
    surface: 'page',
    blocksContent: true,
    announcement: 'assertive',
    recoveryActions: ['retry'],
  },
  'fatal-error': {
    surface: 'global-boundary',
    blocksContent: true,
    announcement: 'assertive',
    recoveryActions: ['reload'],
  },
  'offline': {
    surface: 'global-boundary',
    blocksContent: false,
    announcement: 'assertive',
    recoveryActions: ['reconnect', 'retry'],
  },
  'forbidden': {
    surface: 'page',
    blocksContent: true,
    announcement: 'assertive',
    recoveryActions: ['return'],
  },
  'conflict': {
    surface: 'operation',
    blocksContent: false,
    announcement: 'assertive',
    recoveryActions: ['reload', 'review'],
  },
  'success': {
    surface: 'operation',
    blocksContent: false,
    announcement: 'polite',
    recoveryActions: ['none'],
  },
  'partial-success': {
    surface: 'operation',
    blocksContent: false,
    announcement: 'polite',
    recoveryActions: ['review'],
  },
  'session-expired': {
    surface: 'global-boundary',
    blocksContent: true,
    announcement: 'assertive',
    recoveryActions: ['sign-in'],
  },
} as const satisfies Record<PageStateKind, PageStateContract>
