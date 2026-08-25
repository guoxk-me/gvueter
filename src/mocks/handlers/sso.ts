import type { ApiResponse } from '@/lib/http'
import type {
  SsoConfiguration,
  SsoExchangeInput,
  SsoExchangeResponse,
  SsoStartInput,
  SsoStartResponse,
} from '@/types/auth'
import { http, HttpResponse } from 'msw'
import {
  SSO_EXCHANGE_INPUT_SCHEMA,
  SSO_START_INPUT_SCHEMA,
} from '@/features/account/auth-api-contracts'
import { getPostAuthenticationPath } from '@/features/account/auth-redirect'
import { recordMockLoginActivity } from '@/mocks/data/dashboard'
import { consumeMockSsoTicket, getMockSsoConfiguration, issueMockSsoTicket } from '@/mocks/data/sso'
import { generateMockToken, mockUsers } from '@/mocks/data/users'
import { readMockJsonBody } from '@/mocks/request-validation'
import { NO_STORE_RESPONSE_HEADERS } from '@/mocks/response-headers'
import { getMockAuthenticatedPrincipal } from './auth'

const ACCESS_TOKEN_LIFETIME_SECONDS = 60 * 60 * 24
const MOCK_SSO_TENANT_ID = 'tenant-demo'

function getSsoCallbackUrl(request: Request, fragment: Record<string, string>): string {
  const callbackUrl = new URL('/sso/callback', request.url)
  callbackUrl.hash = new URLSearchParams(fragment).toString()
  return callbackUrl.toString()
}

export const ssoConfigurationHandler = http.get('/api/auth/sso/config', () =>
  HttpResponse.json<ApiResponse<SsoConfiguration>>(
    {
      code: 0,
      message: 'success',
      data: getMockSsoConfiguration(),
    },
    { headers: NO_STORE_RESPONSE_HEADERS },
  ))

export const ssoStartHandler = http.post<never, SsoStartInput>(
  '/api/auth/sso/start',
  async ({ request }) => {
    const requestBody = await readMockJsonBody(request, SSO_START_INPUT_SCHEMA)
    if (!requestBody.isValid)
      return requestBody.response
    if (!getMockSsoConfiguration().isEnabled) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'SSO_NOT_CONFIGURED', message: 'SSO 登录尚未启用', data: null },
        { status: 400, headers: NO_STORE_RESPONSE_HEADERS },
      )
    }

    const ssoUser = mockUsers.find(user => user.id === 1 && user.status === 'active')
    if (!ssoUser) {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'SSO_ACCOUNT_UNAVAILABLE', message: 'SSO 账号不可用', data: null },
        { status: 403, headers: NO_STORE_RESPONSE_HEADERS },
      )
    }

    const returnTo = getPostAuthenticationPath(requestBody.body.returnTo)
    const ticket = issueMockSsoTicket(ssoUser.id, returnTo, MOCK_SSO_TENANT_ID)
    // AI modified: production returns its IdP URL; the Mock returns the fixed app callback.
    return HttpResponse.json<ApiResponse<SsoStartResponse>>(
      {
        code: 0,
        message: 'success',
        data: {
          authorizationUrl: getSsoCallbackUrl(request, { ticket }),
          expiresAt: Date.now() + 60 * 1000,
        },
      },
      { headers: NO_STORE_RESPONSE_HEADERS },
    )
  },
)

export const ssoExchangeHandler = http.post<never, SsoExchangeInput>(
  '/api/auth/sso/exchange',
  async ({ request }) => {
    const requestBody = await readMockJsonBody(request, SSO_EXCHANGE_INPUT_SCHEMA)
    if (!requestBody.isValid)
      return requestBody.response

    const ticket = consumeMockSsoTicket(requestBody.body.ticket)
    if (ticket.status === 'expired') {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'SSO_TICKET_EXPIRED', message: 'SSO 登录请求已过期', data: null },
        { status: 410, headers: NO_STORE_RESPONSE_HEADERS },
      )
    }
    if (ticket.status === 'invalid') {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'SSO_TICKET_INVALID', message: 'SSO 登录请求无效或已使用', data: null },
        { status: 400, headers: NO_STORE_RESPONSE_HEADERS },
      )
    }

    const matchedUser = mockUsers.find(user => user.id === ticket.userId)
    if (!matchedUser || matchedUser.status !== 'active') {
      return HttpResponse.json<ApiResponse<null>>(
        { code: 'SSO_ACCOUNT_UNAVAILABLE', message: 'SSO 账号不可用', data: null },
        { status: 403, headers: NO_STORE_RESPONSE_HEADERS },
      )
    }

    const principal = getMockAuthenticatedPrincipal(matchedUser, ticket.tenantId ?? null)
    const token = generateMockToken(
      principal.user.id,
      ACCESS_TOKEN_LIFETIME_SECONDS,
      principal.tenantId,
    )
    recordMockLoginActivity(principal.user.id)
    return HttpResponse.json<ApiResponse<SsoExchangeResponse>>(
      {
        code: 0,
        message: 'success',
        data: {
          token,
          expiresAt: Date.now() + ACCESS_TOKEN_LIFETIME_SECONDS * 1000,
          ...principal,
          redirectPath: ticket.redirectPath,
        },
      },
      { headers: NO_STORE_RESPONSE_HEADERS },
    )
  },
)

export const ssoHandlers = [ssoConfigurationHandler, ssoStartHandler, ssoExchangeHandler]
