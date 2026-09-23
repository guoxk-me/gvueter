import type { InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'

export type AccessTokenProvider = () => string | undefined
let accessTokenProvider: AccessTokenProvider = () => undefined

export const http = axios.create({
  baseURL: '/api',
  timeout: 15_000,
})

export function configureHttp(apiBaseUrl: string): void {
  http.defaults.baseURL = apiBaseUrl
}

// AI modified: credential injection remains opt-in until gnester-lite authentication is integrated.
export function configureAccessToken(provider: AccessTokenProvider): void {
  accessTokenProvider = provider
}

http.interceptors.request.use((request: InternalAxiosRequestConfig) => {
  if (!request.headers.get('X-Request-ID'))
    request.headers.set('X-Request-ID', crypto.randomUUID())

  const accessToken = accessTokenProvider()
  if (accessToken)
    request.headers.set('Authorization', `Bearer ${accessToken}`)

  return request
})
