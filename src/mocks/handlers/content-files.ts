import type {
  ContentFileListResponse,
  ContentFileMimeType,
  ContentFileRecord,
} from '@/features/content-admin/types/files'
import type { ApiResponse } from '@/lib/http'
import { http, HttpResponse } from 'msw'
import {
  CONTENT_FILE_UPLOAD_RULES,
  getContentFileExtension,
  isContentFileExtensionCompatible,
} from '@/features/content-admin/content-file-policy'
import { CONTENT_FILE_MIME_TYPES } from '@/features/content-admin/types/files'
import { applyUploadPolicy } from '@/features/uploads/upload-policy'
import { getSafeFileName } from '@/lib/http'
import { getMockUploadPolicy } from '@/mocks/data/upload-config'
import { authorizeMockPermission } from './auth'
import { recordMockOperation } from './operation-logs'

const MAX_CONTENT_FILES = 200
const MAX_CONTENT_FILE_STORAGE_BYTES = 64 * 1024 * 1024
const initialFiles: ContentFileRecord[] = [
  {
    id: 'file-access-policy',
    name: 'access-policy.pdf',
    mimeType: 'application/pdf',
    size: 248_320,
    uploadedBy: '超级管理员',
    uploadedAt: '2026-07-03T08:00:00.000Z',
  },
  {
    id: 'file-release-notes',
    // AI modified: the persisted filename proves long bilingual content remains readable after API round trips.
    name: '2026-第三季度亚太区访问权限复核与发布准备说明-quarterly-apac-access-governance-release-readiness-notes.txt',
    mimeType: 'text/plain',
    size: 2_048,
    uploadedBy: '超级管理员',
    uploadedAt: '2026-07-08T08:00:00.000Z',
  },
]
const contentFiles = initialFiles.map((file) => ({ ...file }))
const fileBodies = new Map<string, ArrayBuffer>([
  ['file-access-policy', new TextEncoder().encode('Mock PDF content').buffer as ArrayBuffer],
  ['file-release-notes', new TextEncoder().encode('Release notes').buffer as ArrayBuffer],
])
let contentFileSequence = 1

function copyContentFile(file: ContentFileRecord): ContentFileRecord {
  return { ...file }
}

function isContentFileMimeType(mimeType: string): mimeType is ContentFileMimeType {
  return CONTENT_FILE_MIME_TYPES.includes(mimeType as ContentFileMimeType)
}

function hasMatchingContentSignature(bytes: Uint8Array, mimeType: ContentFileMimeType): boolean {
  const startsWith = (signature: readonly number[]) =>
    signature.every((byte, index) => bytes[index] === byte)

  if (mimeType === 'image/png') return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (mimeType === 'image/jpeg') return startsWith([0xff, 0xd8, 0xff])
  if (mimeType === 'image/webp') {
    return (
      startsWith([0x52, 0x49, 0x46, 0x46]) &&
      [0x57, 0x45, 0x42, 0x50].every((byte, index) => bytes[index + 8] === byte)
    )
  }
  if (mimeType === 'application/pdf') return startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])
  return !bytes.includes(0)
}

function getFileFailure(message: string, code: string, status = 400) {
  return HttpResponse.json<ApiResponse<null>>({ code, message, data: null }, { status })
}

function getContentFile(fileId: string): ContentFileRecord | undefined {
  return contentFiles.find((file) => file.id === fileId)
}

export function resetMockContentFiles(): void {
  contentFiles.splice(0, contentFiles.length, ...initialFiles.map((file) => ({ ...file })))
  fileBodies.clear()
  fileBodies.set(
    'file-access-policy',
    new TextEncoder().encode('Mock PDF content').buffer as ArrayBuffer,
  )
  fileBodies.set(
    'file-release-notes',
    new TextEncoder().encode('Release notes').buffer as ArrayBuffer,
  )
  contentFileSequence = 1
}

export const listContentFilesHandler = http.get('/api/content-files', ({ request }) => {
  const authentication = authorizeMockPermission(request, 'read', 'Content')
  if (!authentication.isAuthenticated) return authentication.response
  const url = new URL(request.url)
  const keyword = url.searchParams.get('keyword')?.trim().toLocaleLowerCase() ?? ''
  const requestedPage = Number(url.searchParams.get('page') ?? 1)
  const requestedPageSize = Number(url.searchParams.get('pageSize') ?? 10)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const pageSize =
    Number.isInteger(requestedPageSize) && requestedPageSize > 0
      ? Math.min(requestedPageSize, 100)
      : 10
  const matchedFiles = contentFiles.filter((file) =>
    file.name.toLocaleLowerCase().includes(keyword),
  )
  const startIndex = (page - 1) * pageSize

  return HttpResponse.json<ApiResponse<ContentFileListResponse>>({
    code: 0,
    message: 'success',
    data: {
      items: matchedFiles.slice(startIndex, startIndex + pageSize).map(copyContentFile),
      total: matchedFiles.length,
      page,
      pageSize,
    },
  })
})

export const uploadContentFileHandler = http.post('/api/content-files', async ({ request }) => {
  // AI modified: file writes use the same Content actions exposed through CASL.
  const authentication = authorizeMockPermission(request, 'create', 'Content')
  if (!authentication.isAuthenticated) return authentication.response
  const encodedFileName = request.headers.get('X-File-Name')
  const mimeType = request.headers.get('Content-Type') ?? ''
  if (!encodedFileName) return getFileFailure('请选择要上传的文件', 'CONTENT_FILE_REQUIRED')
  let requestedFileName = encodedFileName
  try {
    requestedFileName = decodeURIComponent(encodedFileName)
  } catch {
    return getFileFailure('文件名无效', 'INVALID_CONTENT_FILE_NAME')
  }
  const fileName = getSafeFileName(requestedFileName)
  if (!fileName) return getFileFailure('文件名无效', 'INVALID_CONTENT_FILE_NAME')
  if (!isContentFileMimeType(mimeType))
    return getFileFailure('文件类型不受支持', 'UNSUPPORTED_CONTENT_FILE_TYPE', 415)
  if (!isContentFileExtensionCompatible(fileName, mimeType))
    return getFileFailure('文件扩展名与类型不匹配', 'CONTENT_FILE_TYPE_MISMATCH', 415)
  const effectiveUploadPolicy = applyUploadPolicy(getMockUploadPolicy(), CONTENT_FILE_UPLOAD_RULES)
  const fileExtension = getContentFileExtension(fileName)
  if (!fileExtension || !effectiveUploadPolicy.allowedExtensions.includes(fileExtension)) {
    // AI modified: direct API calls cannot bypass the administrator's runtime extension policy.
    return getFileFailure('当前上传策略未启用该扩展名', 'CONTENT_FILE_EXTENSION_DISABLED', 415)
  }
  if (contentFiles.length >= MAX_CONTENT_FILES)
    return getFileFailure('文件数量已达到演示环境上限', 'CONTENT_FILE_CAPACITY_REACHED', 409)
  const uploadedBytes = await request.arrayBuffer()
  if (uploadedBytes.byteLength === 0)
    return getFileFailure('请选择非空文件', 'CONTENT_FILE_REQUIRED')
  if (uploadedBytes.byteLength > effectiveUploadPolicy.maxFileSizeBytes)
    return getFileFailure('文件大小超过当前上传策略限制', 'CONTENT_FILE_TOO_LARGE', 413)
  const retainedByteCount = [...fileBodies.values()].reduce(
    (byteCount, retainedBytes) => byteCount + retainedBytes.byteLength,
    0,
  )
  if (retainedByteCount + uploadedBytes.byteLength > MAX_CONTENT_FILE_STORAGE_BYTES) {
    // AI modified: cumulative binary retention is bounded independently from each-file validation.
    return getFileFailure('演示文件存储空间已满', 'CONTENT_FILE_STORAGE_LIMIT', 413)
  }
  if (!hasMatchingContentSignature(new Uint8Array(uploadedBytes), mimeType))
    return getFileFailure('文件内容与声明类型不匹配', 'CONTENT_FILE_SIGNATURE_MISMATCH', 415)

  const fileId = `content-file-${contentFileSequence++}`
  const file: ContentFileRecord = {
    id: fileId,
    name: fileName,
    mimeType,
    size: uploadedBytes.byteLength,
    uploadedBy: authentication.user.name,
    uploadedAt: new Date().toISOString(),
    previewUrl: mimeType.startsWith('image/') ? `/api/content-files/${fileId}/preview` : undefined,
  }
  // AI modified: persist the validated original bytes; metadata alone cannot support a faithful download.
  contentFiles.unshift(file)
  fileBodies.set(fileId, uploadedBytes)
  recordMockOperation(authentication.user, {
    action: 'upload',
    resource: 'content-file',
    summary: `Uploaded content file ${file.id}.`,
  })
  return HttpResponse.json<ApiResponse<ContentFileRecord>>(
    { code: 0, message: 'created', data: copyContentFile(file) },
    { status: 201 },
  )
})

export const downloadContentFileHandler = http.get<{ fileId: string }>(
  '/api/content-files/:fileId/download',
  ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'read', 'Content')
    if (!authentication.isAuthenticated) return authentication.response
    const file = getContentFile(params.fileId)
    const body = file ? fileBodies.get(file.id) : undefined
    if (!file || !body) return getFileFailure('文件不存在', 'CONTENT_FILE_NOT_FOUND', 404)

    return new HttpResponse(body, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  },
)

export const previewContentFileHandler = http.get<{ fileId: string }>(
  '/api/content-files/:fileId/preview',
  ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'read', 'Content')
    if (!authentication.isAuthenticated) return authentication.response
    const file = getContentFile(params.fileId)
    const body = file ? fileBodies.get(file.id) : undefined
    if (!file || !body || !file.mimeType.startsWith('image/'))
      return getFileFailure('预览不可用', 'CONTENT_FILE_PREVIEW_UNAVAILABLE', 404)
    return new HttpResponse(body, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': file.mimeType,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  },
)

export const deleteContentFileHandler = http.delete<{ fileId: string }>(
  '/api/content-files/:fileId',
  ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'delete', 'Content')
    if (!authentication.isAuthenticated) return authentication.response
    const file = getContentFile(params.fileId)
    if (!file) return getFileFailure('文件不存在', 'CONTENT_FILE_NOT_FOUND', 404)
    contentFiles.splice(contentFiles.indexOf(file), 1)
    fileBodies.delete(file.id)
    recordMockOperation(authentication.user, {
      action: 'delete',
      resource: 'content-file',
      summary: `Deleted content file ${file.id}.`,
    })
    return HttpResponse.json<ApiResponse<null>>({ code: 0, message: 'deleted', data: null })
  },
)

export const contentFileHandlers = [
  listContentFilesHandler,
  uploadContentFileHandler,
  downloadContentFileHandler,
  previewContentFileHandler,
  deleteContentFileHandler,
]
