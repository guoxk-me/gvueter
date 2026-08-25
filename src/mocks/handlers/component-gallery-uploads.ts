import type { UploadReceipt } from '@/lib/api-contracts'
import type { ApiResponse } from '@/lib/http'
import { delay, http, HttpResponse } from 'msw'
import { DEMO_UPLOAD_COMPLETION_INPUT_SCHEMA } from '@/features/component-gallery/operations/upload-lifecycle-api-contracts'
import { getSafeFileName } from '@/lib/http'
import { readMockJsonBody } from '@/mocks/request-validation'
import { authorizeMockPermission } from './auth'

interface DemoUploadReceipt {
  receivedChunkCount: number
}

interface DemoUploadCompletion {
  serverFileId: string
  resultUrl: string
}

interface DemoUploadRecord {
  totalChunks: number
  fileName: string
  receivedChunks: Map<number, ArrayBuffer>
}

interface DemoCompletedUpload {
  fileName: string
  contentType: string
  chunks: ArrayBuffer[]
}

const uploadRecords = new Map<string, DemoUploadRecord>()
const completedUploads = new Map<string, DemoCompletedUpload>()
const rejectedOnceChunks = new Set<string>()
const DEMO_CHUNK_ACKNOWLEDGEMENT_DELAY_MS = 80
const MAX_DEMO_CHUNK_BYTES = 64 * 1024
const MAX_DEMO_CHUNKS = 128
// AI modified: concurrent and completed demo uploads have a fixed aggregate record ceiling.
const MAX_DEMO_UPLOAD_RECORDS = 8
const MAX_REJECTED_CHUNK_RECORDS = 128

function failure(message: string, code: string, status: number) {
  return HttpResponse.json<ApiResponse<null>>({ code, message, data: null }, { status })
}

export function resetComponentGalleryUploads(): void {
  uploadRecords.clear()
  completedUploads.clear()
  rejectedOnceChunks.clear()
}

function keepNewestUploads<T>(records: Map<string, T>): void {
  while (records.size > MAX_DEMO_UPLOAD_RECORDS) {
    const oldestKey = records.keys().next().value
    if (typeof oldestKey !== 'string')
      return
    records.delete(oldestKey)
  }
}

export function saveGalleryEvidenceFile(input: {
  bytes: ArrayBuffer
  contentType: string
  fileName: string
  uploadedAt: string
}): UploadReceipt {
  const fileId = `schema-evidence-${crypto.randomUUID()}`
  // AI modified: multipart form evidence enters the same bounded byte store as completed demo uploads.
  completedUploads.set(fileId, {
    fileName: input.fileName,
    contentType: input.contentType,
    chunks: [input.bytes],
  })
  keepNewestUploads(completedUploads)
  return {
    fileId,
    fileName: input.fileName,
    contentType: input.contentType,
    sizeBytes: input.bytes.byteLength,
    uploadedAt: input.uploadedAt,
  }
}

export const uploadGalleryChunkHandler = http.post<{ uploadId: string, chunkIndex: string }>(
  '/api/component-gallery/uploads/:uploadId/chunks/:chunkIndex',
  async ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'read', 'Dashboard')
    if (!authentication.isAuthenticated)
      return authentication.response

    const chunkIndex = Number(params.chunkIndex)
    const totalChunks = Number(request.headers.get('X-Demo-Total-Chunks'))
    const encodedFileName = request.headers.get('X-Demo-File-Name') ?? ''
    let fileName = ''
    try {
      fileName = getSafeFileName(decodeURIComponent(encodedFileName)) ?? ''
    }
    catch {
      fileName = ''
    }
    if (!fileName)
      return failure('The upload file name is invalid.', 'DEMO_UPLOAD_FILE_NAME_INVALID', 422)
    if (
      !Number.isInteger(chunkIndex)
      || chunkIndex < 0
      || !Number.isInteger(totalChunks)
      || totalChunks <= 0
      || totalChunks > MAX_DEMO_CHUNKS
      || chunkIndex >= totalChunks
    ) {
      return failure('The chunk coordinates are invalid.', 'DEMO_UPLOAD_CHUNK_INVALID', 422)
    }

    const chunkBytes = await request.arrayBuffer()
    if (chunkBytes.byteLength === 0 || chunkBytes.byteLength > MAX_DEMO_CHUNK_BYTES)
      return failure('The chunk is empty.', 'DEMO_UPLOAD_CHUNK_EMPTY', 422)

    // AI modified: a bounded acknowledgement delay makes intermediate progress, pause, and cancellation observable.
    await delay(DEMO_CHUNK_ACKNOWLEDGEMENT_DELAY_MS)
    if (request.signal.aborted)
      return HttpResponse.error()

    const failureKey = `${params.uploadId}:${chunkIndex}`
    if (
      request.headers.get('X-Demo-Fail-Once') === 'true'
      && chunkIndex === 1
      && !rejectedOnceChunks.has(failureKey)
    ) {
      // AI modified: a single deterministic server failure makes partial success and retry reproducible.
      rejectedOnceChunks.add(failureKey)
      while (rejectedOnceChunks.size > MAX_REJECTED_CHUNK_RECORDS) {
        const oldestFailureKey = rejectedOnceChunks.values().next().value
        if (!oldestFailureKey)
          break
        rejectedOnceChunks.delete(oldestFailureKey)
      }
      return failure(
        'The mock storage service rejected this chunk once.',
        'DEMO_UPLOAD_RETRYABLE',
        500,
      )
    }

    const record = uploadRecords.get(params.uploadId) ?? {
      totalChunks,
      fileName,
      receivedChunks: new Map<number, ArrayBuffer>(),
    }
    if (record.totalChunks !== totalChunks || record.fileName !== fileName) {
      return failure(
        'The upload contract changed between chunks.',
        'DEMO_UPLOAD_CONTRACT_CHANGED',
        409,
      )
    }
    // AI modified: retaining bounded demo chunks makes the advertised result URL retrievable.
    record.receivedChunks.set(chunkIndex, chunkBytes)
    uploadRecords.set(params.uploadId, record)
    keepNewestUploads(uploadRecords)

    return HttpResponse.json<ApiResponse<DemoUploadReceipt>>({
      code: 0,
      message: 'accepted',
      data: { receivedChunkCount: record.receivedChunks.size },
    })
  },
)

export const completeGalleryUploadHandler = http.post<{ uploadId: string }>(
  '/api/component-gallery/uploads/:uploadId/complete',
  async ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'read', 'Dashboard')
    if (!authentication.isAuthenticated)
      return authentication.response

    const record = uploadRecords.get(params.uploadId)
    const completionBody = await readMockJsonBody(request, DEMO_UPLOAD_COMPLETION_INPUT_SCHEMA)
    if (!completionBody.isValid)
      return completionBody.response
    const requestBody = completionBody.body
    if (!record)
      return failure('No upload session exists.', 'DEMO_UPLOAD_SESSION_NOT_FOUND', 404)
    const requestedTotal = requestBody.totalChunks
    const requestedFileName = getSafeFileName(requestBody.fileName)
    const requestedContentType = requestBody.mimeType
    if (requestedFileName !== record.fileName || !requestedContentType)
      return failure('The completion payload is invalid.', 'DEMO_UPLOAD_COMPLETION_INVALID', 422)
    if (requestedTotal !== record.totalChunks || record.receivedChunks.size !== record.totalChunks)
      return failure('Some chunks are still missing.', 'DEMO_UPLOAD_INCOMPLETE', 409)

    const serverFileId = `demo-file-${params.uploadId}`
    const chunks = Array.from({ length: record.totalChunks }, (_, chunkIndex) =>
      record.receivedChunks.get(chunkIndex))
    if (chunks.includes(undefined))
      return failure('Some chunks are still missing.', 'DEMO_UPLOAD_INCOMPLETE', 409)

    completedUploads.set(serverFileId, {
      fileName: record.fileName,
      contentType: requestedContentType,
      chunks: chunks.filter((chunk): chunk is ArrayBuffer => chunk !== undefined),
    })
    keepNewestUploads(completedUploads)
    uploadRecords.delete(params.uploadId)
    return HttpResponse.json<ApiResponse<DemoUploadCompletion>>(
      {
        code: 0,
        message: 'created',
        data: {
          serverFileId,
          resultUrl: `/api/component-gallery/files/${serverFileId}`,
        },
      },
      { status: 201 },
    )
  },
)

export const cancelGalleryUploadHandler = http.delete<{ uploadId: string }>(
  '/api/component-gallery/uploads/:uploadId',
  ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'read', 'Dashboard')
    if (!authentication.isAuthenticated)
      return authentication.response

    uploadRecords.delete(params.uploadId)
    completedUploads.delete(`demo-file-${params.uploadId}`)
    return HttpResponse.json<ApiResponse<null>>({ code: 0, message: 'canceled', data: null })
  },
)

export const downloadGalleryUploadHandler = http.get<{ serverFileId: string }>(
  '/api/component-gallery/files/:serverFileId',
  ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'read', 'Dashboard')
    if (!authentication.isAuthenticated)
      return authentication.response

    const completedUpload = completedUploads.get(params.serverFileId)
    if (!completedUpload)
      return failure('The completed demo file was not found.', 'DEMO_UPLOAD_FILE_NOT_FOUND', 404)

    const fileBytes = new Uint8Array(
      completedUpload.chunks.reduce((byteCount, chunk) => byteCount + chunk.byteLength, 0),
    )
    let byteOffset = 0
    for (const chunk of completedUpload.chunks) {
      fileBytes.set(new Uint8Array(chunk), byteOffset)
      byteOffset += chunk.byteLength
    }
    // AI modified: the download returns reconstructed binary bytes instead of a textual Blob coercion.
    return new HttpResponse(fileBytes, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(completedUpload.fileName)}`,
        'Content-Type': completedUpload.contentType,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  },
)

export const componentGalleryUploadHandlers = [
  uploadGalleryChunkHandler,
  completeGalleryUploadHandler,
  cancelGalleryUploadHandler,
  downloadGalleryUploadHandler,
]
