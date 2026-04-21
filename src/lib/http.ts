import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const TIMEOUT = 15_000

export const http = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor ──────────────────────────────────────────────────────

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token')
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

    if (status === 401) {
      // Clear stale token and redirect to login
      localStorage.removeItem('token')
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
  code: number
  message: string
  data: T
}

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await http.get<ApiResponse<T>>(url, { params })
  return res.data.data
}

export async function post<T>(url: string, data?: unknown): Promise<T> {
  const res = await http.post<ApiResponse<T>>(url, data)
  return res.data.data
}

export async function put<T>(url: string, data?: unknown): Promise<T> {
  const res = await http.put<ApiResponse<T>>(url, data)
  return res.data.data
}

export async function del<T>(url: string): Promise<T> {
  const res = await http.delete<ApiResponse<T>>(url)
  return res.data.data
}
