export interface MockMultipartPart {
  bytes: ArrayBuffer
  contentType: string
  fileName?: string
  name: string
}

const HEADER_SEPARATOR = new Uint8Array([13, 10, 13, 10])
const LINE_BREAK = new Uint8Array([13, 10])
const MAX_MULTIPART_BOUNDARY_LENGTH = 200
const MAX_MULTIPART_HEADER_BYTES = 8 * 1024
const MAX_MULTIPART_PARTS = 8

function findByteSequence(
  sourceBytes: Uint8Array,
  requestedBytes: Uint8Array,
  startIndex: number,
): number {
  const lastStartIndex = sourceBytes.length - requestedBytes.length
  for (let sourceIndex = startIndex; sourceIndex <= lastStartIndex; sourceIndex += 1) {
    let isMatch = true
    for (let requestedIndex = 0; requestedIndex < requestedBytes.length; requestedIndex += 1) {
      if (sourceBytes[sourceIndex + requestedIndex] !== requestedBytes[requestedIndex]) {
        isMatch = false
        break
      }
    }
    if (isMatch) return sourceIndex
  }
  return -1
}

function hasBytesAt(
  sourceBytes: Uint8Array,
  requestedBytes: Uint8Array,
  startIndex: number,
): boolean {
  return requestedBytes.every(
    (requestedByte, requestedIndex) => sourceBytes[startIndex + requestedIndex] === requestedByte,
  )
}

function getMultipartBoundary(contentType: string): string | undefined {
  const boundaryMatch = /(?:^|;)\s*boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType)
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2]
  if (
    !boundary ||
    boundary.length > MAX_MULTIPART_BOUNDARY_LENGTH ||
    [...boundary].some((character) => character.charCodeAt(0) < 32)
  ) {
    return undefined
  }
  return boundary
}

function readPartHeaders(headerBytes: Uint8Array): Omit<MockMultipartPart, 'bytes'> | undefined {
  if (headerBytes.byteLength > MAX_MULTIPART_HEADER_BYTES) return undefined

  let headerText = ''
  try {
    headerText = new TextDecoder('utf-8', { fatal: true }).decode(headerBytes)
  } catch {
    return undefined
  }
  const headerLines = headerText.split('\r\n')
  const disposition = headerLines
    .find((headerLine) => headerLine.toLocaleLowerCase().startsWith('content-disposition:'))
    ?.slice('content-disposition:'.length)
    .trim()
  if (!disposition?.toLocaleLowerCase().startsWith('form-data;')) return undefined

  const name = /(?:^|;)\s*name="([^"]*)"/i.exec(disposition)?.[1]
  const fileName = /(?:^|;)\s*filename="([^"]*)"/i.exec(disposition)?.[1]
  if (!name) return undefined

  const contentType =
    headerLines
      .find((headerLine) => headerLine.toLocaleLowerCase().startsWith('content-type:'))
      ?.slice('content-type:'.length)
      .trim()
      .toLocaleLowerCase() ?? 'text/plain'
  return {
    contentType,
    ...(fileName === undefined ? {} : { fileName }),
    name,
  }
}

// AI modified: Mock multipart parsing preserves binary bytes across browser and JSDOM File realms.
export function readMockMultipartParts(
  contentType: string,
  body: ArrayBuffer,
): MockMultipartPart[] | undefined {
  const boundary = getMultipartBoundary(contentType)
  if (!boundary) return undefined

  const bodyBytes = new Uint8Array(body)
  const boundaryBytes = new TextEncoder().encode(`--${boundary}`)
  const followingBoundaryBytes = new TextEncoder().encode(`\r\n--${boundary}`)
  if (!hasBytesAt(bodyBytes, boundaryBytes, 0)) return undefined

  const parts: MockMultipartPart[] = []
  let cursor = boundaryBytes.length
  while (cursor < bodyBytes.length) {
    if (bodyBytes[cursor] === 45 && bodyBytes[cursor + 1] === 45) return parts
    if (!hasBytesAt(bodyBytes, LINE_BREAK, cursor)) return undefined
    cursor += LINE_BREAK.length

    const headerEnd = findByteSequence(bodyBytes, HEADER_SEPARATOR, cursor)
    if (headerEnd < 0) return undefined
    const partHeaders = readPartHeaders(bodyBytes.slice(cursor, headerEnd))
    if (!partHeaders) return undefined

    const contentStart = headerEnd + HEADER_SEPARATOR.length
    const nextBoundary = findByteSequence(bodyBytes, followingBoundaryBytes, contentStart)
    if (nextBoundary < 0) return undefined
    parts.push({
      ...partHeaders,
      bytes: bodyBytes.slice(contentStart, nextBoundary).buffer,
    })
    if (parts.length > MAX_MULTIPART_PARTS) return undefined
    cursor = nextBoundary + LINE_BREAK.length + boundaryBytes.length
  }
  return undefined
}
