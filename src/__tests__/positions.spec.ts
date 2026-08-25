import type {
  PositionInput,
  PositionListResponse,
  PositionRecord,
} from '@/features/positions/types'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { del, get, post, put } from '@/lib/http'
import { generateMockToken } from '@/mocks/data/users'
import { resetMockPositions } from '@/mocks/handlers/positions'

const newPosition: PositionInput = {
  code: 'support-engineer',
  name: 'Support Engineer',
  description: 'Owns technical customer support.',
  order: 15,
  status: 'active',
}

describe('position management API', () => {
  beforeEach(() => {
    resetMockPositions()
    localStorage.removeItem('auth_token')
    sessionStorage.setItem('auth_token', generateMockToken(1))
  })
  afterEach(() => {
    localStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_token')
  })

  it('filters the server list by keyword and status', async () => {
    const response = await get<PositionListResponse>('/positions', {
      keyword: 'engineer',
      status: 'active',
    })

    expect(response.total).toBe(1)
    expect(response.items[0]?.code).toBe('frontend-engineer')
  })

  it('creates, updates, and deletes a position', async () => {
    const createdPosition = await post<PositionRecord>('/positions', newPosition)
    expect(createdPosition).toMatchObject(newPosition)

    const updatedPosition = await put<PositionRecord>(`/positions/${createdPosition.id}`, {
      ...newPosition,
      name: 'Customer Support Engineer',
      status: 'disabled',
    })
    expect(updatedPosition).toMatchObject({
      name: 'Customer Support Engineer',
      status: 'disabled',
    })

    await del(`/positions/${createdPosition.id}`)
    const response = await get<PositionListResponse>('/positions', { keyword: newPosition.code })
    expect(response.total).toBe(0)
  })

  it('rejects editor and viewer access without Settings permission', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(2))
    // AI modified: position management reads enforce the same Settings ability as its route.
    await expect(get<PositionListResponse>('/positions')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
    await expect(post('/positions', newPosition)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })

    sessionStorage.setItem('auth_token', generateMockToken(3))
    await expect(post('/positions', newPosition)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
  })
})
