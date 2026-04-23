import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const TIMEOUT = 15_000

// ── Custom error class ────────────────────────────────────────────────────────

/**
 * 业务错误：服务端返回了明确的错误码和消息。
 * 上层可通过 `error instanceof ApiError` 判断，并通过 `error.code` 细化处理。
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const http = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor ──────────────────────────────────────────────────────

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor ─────────────────────────────────────────────────────

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status
    const url = error.config?.url ?? ''

    // 登录接口的 401 由调用方自行处理，不触发全局跳转
    const isLoginRequest = url.includes('/auth/login')

    if (status === 401 && !isLoginRequest) {
      // Clear stale token and redirect to login
      localStorage.removeItem('auth_token')
      // Avoid circular dependency with router by using location directly
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

// ── Typed helpers ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  code: number | string
  message: string
  data: T
}

/**
 * 将 axios 错误转换为 ApiError（如果服务端返回了业务错误码），
 * 否则直接 re-throw 原始错误（网络超时、服务器宕机等）。
 */
function extractApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiResponse<unknown> | undefined
    if (body?.code !== undefined && body?.message) {
      throw new ApiError(String(body.code), body.message)
    }
  }
  throw error
}

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  try {
    const res = await http.get<ApiResponse<T>>(url, { params })
    return res.data.data
  } catch (e) {
    extractApiError(e)
  }
}

export async function post<T>(url: string, data?: unknown): Promise<T> {
  try {
    const res = await http.post<ApiResponse<T>>(url, data)
    return res.data.data
  } catch (e) {
    extractApiError(e)
  }
}

export async function put<T>(url: string, data?: unknown): Promise<T> {
  try {
    const res = await http.put<ApiResponse<T>>(url, data)
    return res.data.data
  } catch (e) {
    extractApiError(e)
  }
}

export async function del<T>(url: string): Promise<T> {
  try {
    const res = await http.delete<ApiResponse<T>>(url)
    return res.data.data
  } catch (e) {
    extractApiError(e)
  }
}
