export interface MockLoginActivity {
  id: string
  userId: number
  occurredAt: string
  status: 'failed' | 'success'
}

const initialLoginActivities: readonly MockLoginActivity[] = [
  { id: 'login-001', userId: 1, occurredAt: '2026-07-13T02:15:00.000Z', status: 'success' },
  { id: 'login-002', userId: 2, occurredAt: '2026-07-13T04:40:00.000Z', status: 'success' },
  { id: 'login-003', userId: 3, occurredAt: '2026-07-13T05:20:00.000Z', status: 'failed' },
  { id: 'login-004', userId: 4, occurredAt: '2026-07-13T06:05:00.000Z', status: 'success' },
  { id: 'login-005', userId: 5, occurredAt: '2026-07-13T07:10:00.000Z', status: 'success' },
  { id: 'login-006', userId: 1, occurredAt: '2026-07-13T08:12:00.000Z', status: 'success' },
]

const loginActivities = initialLoginActivities.map(activity => ({ ...activity }))
let loginActivitySequence = initialLoginActivities.length

export function getMockLoginActivities(): MockLoginActivity[] {
  return loginActivities.map(activity => ({ ...activity }))
}

export function recordMockLoginActivity(userId: number, occurredAt = new Date()): void {
  loginActivitySequence += 1
  // AI modified: successful mock authentication now contributes to the operational dashboard.
  loginActivities.unshift({
    id: `login-${loginActivitySequence}`,
    userId,
    occurredAt: occurredAt.toISOString(),
    status: 'success',
  })
  loginActivities.splice(50)
}

export function resetMockDashboardData(): void {
  loginActivities.splice(
    0,
    loginActivities.length,
    ...initialLoginActivities.map(activity => ({ ...activity })),
  )
  loginActivitySequence = initialLoginActivities.length
}
