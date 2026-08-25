import type { AxiosProgressEvent, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'
import { API_ENVELOPE_SCHEMA } from '@/lib/api-contracts'
import { getSessionAccessToken } from '@/lib/auth-session'
import { notifyForbidden, notifySessionInvalidated } from '@/lib/request-policy'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
const TIMEOUT = 15_000
const SUCCESS_CODES = new Set<number | string>([0, 200, '0', '200', 'OK', 'SUCCESS'])
const REQUEST_ID_HEADER = 'X-Request-ID'
const UNAUTHENTICATED_REQUEST_PATHS = new Set([
  '/auth/captcha',
  '/auth/forgot-password',
  '/auth/login',
  '/auth/reset-password',
  '/auth/sso/config',
  '/auth/sso/exchange',
  '/auth/sso/start',
])
const UNAUTHENTICATED_REQUEST_PREFIXES = ['/contract-scenarios/'] as const
const SESSION_INVALIDATION_CODES = new Set([
  'ACCOUNT_DISABLED',
  'ACCOUNT_SUSPENDED',
  'INVALID_TOKEN',
  'SESSION_EXPIRED',
  'SESSION_REVOKED',
])

export const API_ERROR_CATEGORIES = [
  'canceled',
  'authentication',
  'authorization',
  'conflict',
  'validation',
  'timeout',
  'network',
  'server',
  'client',
  'contract',
  'unknown',
] as const

export type ApiErrorCategory = (typeof API_ERROR_CATEGORIES)[number]

export const API_ERROR_ACTIONS = [
  'none',
  'retry',
  'sign-in',
  'request-access',
  'refresh',
  'review-input',
  'contact-support',
] as const

export type ApiErrorAction = (typeof API_ERROR_ACTIONS)[number]

export interface ApiEnvelope<T = unknown> {
  code: number | string
  message: string
  data: T
}

/** Compatibility alias for existing handlers and consumers. */
export type ApiResponse<T = unknown> = ApiEnvelope<T>

export interface ApiErrorContext {
  category?: ApiErrorCategory
  nextAction?: ApiErrorAction
  requestId?: string
}

export function getApiErrorCategory(code: string, status?: number): ApiErrorCategory {
  const upperCode = code.toUpperCase()
  if (upperCode === 'REQUEST_CANCELED')
    return 'canceled'
  if (SESSION_INVALIDATION_CODES.has(upperCode))
    return 'authentication'
  if (status === 401 || ['401', 'TOKEN_EXPIRED', 'UNAUTHORIZED'].includes(upperCode))
    return 'authentication'
  if (status === 403 || ['403', 'FORBIDDEN'].includes(upperCode))
    return 'authorization'
  if (status === 409 || upperCode.includes('CONFLICT'))
    return 'conflict'
  if (status === 422 || upperCode.includes('VALIDATION') || upperCode.includes('INVALID_INPUT'))
    return 'validation'
  if (status === 408 || upperCode === 'REQUEST_TIMEOUT' || upperCode.includes('TIMEOUT'))
    return 'timeout'
  if (upperCode === 'NETWORK_ERROR')
    return 'network'
  if (typeof status === 'number' && status >= 500)
    return 'server'
  if (upperCode === 'INVALID_API_ENVELOPE' || upperCode === 'INVALID_API_RESPONSE_DATA')
    return 'contract'
  if (typeof status === 'number' && status >= 400)
    return 'client'
  return 'unknown'
}

export function getApiErrorAction(category: ApiErrorCategory): ApiErrorAction {
  if (category === 'authentication')
    return 'sign-in'
  if (category === 'authorization')
    return 'request-access'
  if (category === 'conflict')
    return 'refresh'
  if (category === 'validation' || category === 'client')
    return 'review-input'
  if (category === 'timeout' || category === 'network' || category === 'server')
    return 'retry'
  if (category === 'contract' || category === 'unknown')
    return 'contact-support'
  return 'none'
}

export class ApiError extends Error {
  public readonly category: ApiErrorCategory
  public readonly nextAction: ApiErrorAction
  public readonly requestId?: string

  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
    public readonly details?: unknown,
    context: ApiErrorContext = {},
  ) {
    super(message)
    this.name = 'ApiError'
    // AI modified: every transport failure carries one stable category, recovery hint, and trace ID.
    this.category = context.category ?? getApiErrorCategory(code, status)
    this.nextAction = context.nextAction ?? getApiErrorAction(this.category)
    this.requestId = context.requestId
  }
}

export interface GetRequestOptions {
  /** Defaults to true so a newer GET supersedes an identical pending request. */
  cancelDuplicate?: boolean
  /** Overrides the URL + params identity when callers need a domain-specific key. */
  requestKey?: string
}

export interface ResponseDataSchema<T> {
  safeParse: (
    value: unknown,
  ) => { success: true, data: T } | { success: false, error: { issues: unknown } }
}

export interface ResponseContractOptions<T> {
  /** Optional feature contract applied after the shared envelope schema. */
  responseSchema?: ResponseDataSchema<T>
}

export interface PostRequestOptions<T> extends ResponseContractOptions<T> {
  headers?: Record<string, string>
  signal?: AbortSignal
}

export interface UploadRequestOptions {
  fieldName?: string
  fileName?: string
  fields?: Record<string, Blob | boolean | number | string>
  onProgress?: (progress: AxiosProgressEvent) => void
}

export interface UploadFileBytesOptions {
  fileName?: string
  onProgress?: (progress: AxiosProgressEvent) => void
}

export interface UploadFileBytesPayload {
  name?: string
  type: string
  arrayBuffer: () => Promise<ArrayBuffer>
}

export interface DownloadRequestOptions {
  params?: Record<string, unknown>
  onProgress?: (progress: AxiosProgressEvent) => void
}

export interface DownloadedFile {
  blob: Blob
  fileName?: string
  contentType?: string
}

const pendingGetRequests = new Map<string, AbortController>()

export function getSafeFileName(fileName: string): string | undefined {
  const pathSegments = fileName.split(/[\\/]/)
  const finalSegment = pathSegments[pathSegments.length - 1]?.trim() ?? ''
  const printableName = [...finalSegment]
    .filter(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
    .join('')
    .replace(/^\.+/, '')
    .trim()

  return printableName ? printableName.slice(0, 180) : undefined
}

export const http = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
})

function isUnauthenticatedRequestPath(requestPath: string | undefined): boolean {
  if (!requestPath)
    return false
  return (
    UNAUTHENTICATED_REQUEST_PATHS.has(requestPath)
    || UNAUTHENTICATED_REQUEST_PREFIXES.some(prefix => requestPath.startsWith(prefix))
  )
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!config.headers.get(REQUEST_ID_HEADER)) {
    // AI modified: preserve one client trace identifier even when an upstream omits its own ID.
    config.headers.set(REQUEST_ID_HEADER, crypto.randomUUID())
  }
  const token = getSessionAccessToken()
  const requestPath = config.url?.split(/[?#]/, 1)[0]
  // AI modified: public authentication attempts must not carry or end an unrelated active session.
  if (isUnauthenticatedRequestPath(requestPath)) {
    config.headers.delete('Authorization')
  }
  else if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return (
    typeof value === 'object'
    && value !== null
    && 'code' in value
    && 'message' in value
    && 'data' in value
  )
}

function isSuccessfulBusinessCode(code: number | string): boolean {
  return SUCCESS_CODES.has(code)
}

function getAccessFailureStatus(error: ApiError): 401 | 403 | undefined {
  const code = error.code.toUpperCase()
  // AI modified: explicit account/session termination codes end the session even when transported as 403.
  if (SESSION_INVALIDATION_CODES.has(code))
    return 401
  if (error.status === 401 || ['401', 'TOKEN_EXPIRED', 'UNAUTHORIZED'].includes(code)) {
    return 401
  }
  if (error.status === 403 || ['403', 'FORBIDDEN'].includes(code)) {
    return 403
  }
  return undefined
}

function hasCurrentAuthenticatedRequest(config?: InternalAxiosRequestConfig): boolean {
  const requestPath = config?.url?.split(/[?#]/, 1)[0]
  // AI modified: public identity-entry failures never invalidate an already active principal.
  if (isUnauthenticatedRequestPath(requestPath))
    return false
  const authorization = config?.headers.get('Authorization')
  const currentToken = getSessionAccessToken()
  // AI modified: a late response from an older credential cannot invalidate the replacement session.
  return Boolean(currentToken && authorization === `Bearer ${currentToken}`)
}

function getHeaderValue(headers: AxiosResponse['headers'], headerName: string): string | undefined {
  const headerValue = headers[headerName]
  if (typeof headerValue === 'string' && headerValue.trim())
    return headerValue.trim().slice(0, 200)
  return undefined
}

function getRequestId(
  response?: AxiosResponse,
  config?: InternalAxiosRequestConfig,
): string | undefined {
  const responseRequestId = response
    ? (getHeaderValue(response.headers, 'x-request-id')
      ?? getHeaderValue(response.headers, 'x-correlation-id'))
    : undefined
  if (responseRequestId)
    return responseRequestId

  const requestHeader = config?.headers.get(REQUEST_ID_HEADER)
  return typeof requestHeader === 'string' && requestHeader.trim()
    ? requestHeader.trim().slice(0, 200)
    : undefined
}

async function applyAccessFailurePolicy(
  error: ApiError,
  config?: InternalAxiosRequestConfig,
): Promise<void> {
  const status = getAccessFailureStatus(error)
  if (!status || !hasCurrentAuthenticatedRequest(config)) {
    return
  }

  const failure = {
    status: error.status === 401 || error.status === 403 ? error.status : status,
    code: error.code,
    message: error.message,
    requestUrl: config?.url,
    requestId: error.requestId,
  }

  if (status === 401) {
    await notifySessionInvalidated(failure)
    return
  }
  await notifyForbidden(failure)
}

async function getResponseBody(error: unknown): Promise<unknown> {
  if (!axios.isAxiosError(error) || !error.response)
    return undefined

  const body: unknown = error.response.data
  const contentType = getHeaderValue(error.response.headers, 'content-type')?.toLowerCase() ?? ''
  if (!contentType.includes('/json') && !contentType.includes('+json'))
    return body

  try {
    // AI modified: download failures arrive as Blob/bytes, so recover JSON envelopes before policy handling.
    if (typeof Blob !== 'undefined' && body instanceof Blob) {
      return JSON.parse(await body.text()) as unknown
    }
    if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) {
      return JSON.parse(new TextDecoder().decode(body)) as unknown
    }
    if (typeof body === 'string') {
      return JSON.parse(body) as unknown
    }
  }
  catch {
    return body
  }

  return body
}

async function getApiError(error: unknown): Promise<ApiError> {
  if (error instanceof ApiError) {
    return error
  }

  if (axios.isCancel(error)) {
    return new ApiError('REQUEST_CANCELED', 'The request was superseded by a newer request')
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const body = await getResponseBody(error)
    const requestId = getRequestId(error.response, error.config)
    if (isApiEnvelope(body)) {
      return new ApiError(String(body.code), body.message, status, body.data, { requestId })
    }

    if (error.code === 'ECONNABORTED') {
      return new ApiError('REQUEST_TIMEOUT', 'The request timed out', status, undefined, {
        requestId,
      })
    }

    if (!error.response) {
      return new ApiError('NETWORK_ERROR', 'The network request failed', undefined, undefined, {
        requestId,
      })
    }

    return new ApiError(
      `HTTP_${status ?? 'UNKNOWN'}`,
      error.response.statusText || 'The request failed',
      status,
      body,
      { requestId },
    )
  }

  return new ApiError(
    'UNKNOWN_ERROR',
    error instanceof Error ? error.message : 'An unknown request error occurred',
  )
}

http.interceptors.response.use(
  async (response: AxiosResponse) => {
    if (isApiEnvelope(response.data) && !isSuccessfulBusinessCode(response.data.code)) {
      // AI modified: reject business failures even when the HTTP transport returned 2xx.
      const error = new ApiError(
        String(response.data.code),
        response.data.message,
        response.status,
        response.data.data,
        { requestId: getRequestId(response, response.config) },
      )
      await applyAccessFailurePolicy(error, response.config)
      throw error
    }
    return response
  },
  async (error: unknown) => {
    const apiError = await getApiError(error)
    const config = axios.isAxiosError(error) ? error.config : undefined
    await applyAccessFailurePolicy(apiError, config)
    throw apiError
  },
)

function getEnvelopeData<T>(response: AxiosResponse, responseSchema?: ResponseDataSchema<T>): T {
  const envelopeResult = API_ENVELOPE_SCHEMA.safeParse(response.data)
  if (!envelopeResult.success) {
    throw new ApiError(
      'INVALID_API_ENVELOPE',
      'The API response does not match ApiEnvelope',
      response.status,
      envelopeResult.error.issues,
      { requestId: getRequestId(response, response.config) },
    )
  }

  if (!responseSchema)
    return envelopeResult.data.data as T
  const dataResult = responseSchema.safeParse(envelopeResult.data.data)
  if (!dataResult.success) {
    // AI modified: feature callers can reject structurally invalid payloads before state or UI consumes them.
    throw new ApiError(
      'INVALID_API_RESPONSE_DATA',
      'The API response data does not match the endpoint contract',
      response.status,
      dataResult.error.issues,
      { requestId: getRequestId(response, response.config) },
    )
  }
  return dataResult.data
}

function getRequestKey(url: string, params?: Record<string, unknown>): string {
  const entries = Object.entries(params ?? {})
    .filter(([, value]) => value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)])
  return `GET:${url}?${new URLSearchParams(entries).toString()}`
}

export function isUnauthorizedError(error: unknown): error is ApiError {
  if (!(error instanceof ApiError))
    return false
  const code = error.code.toUpperCase()
  return error.status === 401 || ['401', 'TOKEN_EXPIRED', 'UNAUTHORIZED'].includes(code)
}

export function isSessionInvalidatingError(error: unknown): error is ApiError {
  return error instanceof ApiError && getAccessFailureStatus(error) === 401
}

export function isForbiddenError(error: unknown): error is ApiError {
  return error instanceof ApiError && getAccessFailureStatus(error) === 403
}

export function isCanceledRequest(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === 'REQUEST_CANCELED'
}

export async function get<T>(
  url: string,
  params?: Record<string, unknown>,
  options: GetRequestOptions & ResponseContractOptions<T> = {},
): Promise<T> {
  const requestKey = options.requestKey ?? getRequestKey(url, params)
  const shouldCancelDuplicate = options.cancelDuplicate ?? true
  const controller = shouldCancelDuplicate ? new AbortController() : undefined

  if (controller) {
    // AI modified: abort only the older request sharing this business request key.
    pendingGetRequests.get(requestKey)?.abort()
    pendingGetRequests.set(requestKey, controller)
  }

  try {
    const response = await http.get<ApiEnvelope<T>>(url, {
      params,
      signal: controller?.signal,
    })
    return getEnvelopeData<T>(response, options.responseSchema)
  }
  finally {
    if (controller && pendingGetRequests.get(requestKey) === controller) {
      pendingGetRequests.delete(requestKey)
    }
  }
}

export async function post<T>(
  url: string,
  data?: unknown,
  options: PostRequestOptions<T> = {},
): Promise<T> {
  // AI modified: cancellable binary commands still pass through the shared envelope and data contracts.
  const response = await http.post<ApiEnvelope<T>>(url, data, {
    headers: options.headers,
    signal: options.signal,
  })
  return getEnvelopeData<T>(response, options.responseSchema)
}

export async function put<T>(
  url: string,
  data?: unknown,
  options: ResponseContractOptions<T> = {},
): Promise<T> {
  const response = await http.put<ApiEnvelope<T>>(url, data)
  return getEnvelopeData<T>(response, options.responseSchema)
}

export async function del<T>(url: string, options: ResponseContractOptions<T> = {}): Promise<T> {
  const response = await http.delete<ApiEnvelope<T>>(url)
  return getEnvelopeData<T>(response, options.responseSchema)
}

export async function upload<T>(
  url: string,
  file: Blob,
  options: UploadRequestOptions = {},
): Promise<T> {
  const formData = new FormData()
  const fieldName = options.fieldName ?? 'file'
  // AI modified: never forward path segments or control characters as multipart filenames.
  const fileName = getSafeFileName(options.fileName ?? (file as File).name)
  if (fileName) {
    formData.append(fieldName, file, fileName)
  }
  else {
    formData.append(fieldName, file)
  }

  for (const [key, value] of Object.entries(options.fields ?? {})) {
    formData.append(key, value instanceof Blob ? value : String(value))
  }

  const response = await http.post<ApiEnvelope<T>>(url, formData, {
    // AI modified: XHR preserves native multipart boundaries and upload progress in browsers.
    adapter: 'xhr',
    onUploadProgress: options.onProgress,
  })
  return getEnvelopeData<T>(response)
}

export async function uploadFileBytes<T>(
  url: string,
  file: UploadFileBytesPayload,
  options: UploadFileBytesOptions & ResponseContractOptions<T> = {},
): Promise<T> {
  const fileName = getSafeFileName(options.fileName ?? file.name ?? '')
  if (!fileName)
    throw new ApiError('INVALID_UPLOAD_FILE_NAME', 'The upload file name is invalid')

  // AI modified: binary uploads preserve the original payload without trusting client metadata sizes.
  const response = await http.post<ApiEnvelope<T>>(url, await file.arrayBuffer(), {
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(fileName),
    },
    onUploadProgress: options.onProgress,
  })
  // AI modified: binary import receipts use the same explicit runtime contract as JSON responses.
  return getEnvelopeData<T>(response, options.responseSchema)
}

function getDownloadFileName(contentDisposition?: string): string | undefined {
  if (!contentDisposition) {
    return undefined
  }

  const encodedName = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)?.[1]
  if (encodedName) {
    try {
      return getSafeFileName(decodeURIComponent(encodedName))
    }
    catch {
      return getSafeFileName(encodedName)
    }
  }

  const plainName = /filename="?([^";]+)"?/i.exec(contentDisposition)?.[1]
  return plainName ? getSafeFileName(plainName) : undefined
}

export async function download(
  url: string,
  options: DownloadRequestOptions = {},
): Promise<DownloadedFile> {
  const response = await http.get<Blob>(url, {
    params: options.params,
    responseType: 'blob',
    onDownloadProgress: options.onProgress,
  })
  const contentTypeHeader = response.headers['content-type']
  const contentDispositionHeader = response.headers['content-disposition']
  const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader : undefined
  const contentDisposition
    = typeof contentDispositionHeader === 'string' ? contentDispositionHeader : undefined

  return {
    blob: response.data,
    fileName: getDownloadFileName(contentDisposition),
    contentType,
  }
}
