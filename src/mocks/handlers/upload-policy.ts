import type { UploadPolicy } from '@/features/uploads/types'
import type { ApiResponse } from '@/lib/http'
import { http, HttpResponse } from 'msw'
import { getMockUploadPolicy } from '@/mocks/data/upload-config'
import { authenticateMockRequest } from './auth'

export const getUploadPolicyHandler = http.get('/api/uploads/policy', ({ request }) => {
  const authentication = authenticateMockRequest(request)
  if (!authentication.isAuthenticated)
    return authentication.response

  return HttpResponse.json<ApiResponse<UploadPolicy>>(
    { code: 0, message: 'success', data: getMockUploadPolicy() },
    { headers: { 'Cache-Control': 'no-store' } },
  )
})

export const uploadPolicyHandlers = [getUploadPolicyHandler]
