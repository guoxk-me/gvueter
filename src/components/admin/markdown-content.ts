export type MarkdownInline
  = | { kind: 'text', text: string }
    | { kind: 'strong', children: readonly MarkdownInline[] }
    | { kind: 'emphasis', children: readonly MarkdownInline[] }
    | { kind: 'code', text: string }
    | { kind: 'link', children: readonly MarkdownInline[], href?: string }
    | { kind: 'image', alt: string, source?: string }

export type MarkdownBlock
  = | { kind: 'heading', level: number, children: readonly MarkdownInline[] }
    | { kind: 'paragraph', lines: readonly (readonly MarkdownInline[])[] }
    | { kind: 'quote', children: readonly MarkdownInline[] }
    | { kind: 'code', language: string, source: string }
    | { kind: 'list', ordered: boolean, entries: readonly (readonly MarkdownInline[])[] }
    | { kind: 'separator' }

interface MarkdownDestinationPolicy {
  kind: 'image' | 'link'
  allowedImageOrigins: readonly string[]
}

function safeDestination(
  destination: string,
  policy: MarkdownDestinationPolicy,
): string | undefined {
  const requestedDestination = destination.trim()
  if (
    !requestedDestination
    || [...requestedDestination].some(character => character.charCodeAt(0) < 32)
  ) {
    return undefined
  }
  // AI modified: reject backslashes because special-scheme URL parsers can reinterpret them as host separators.
  if (requestedDestination.includes('\\'))
    return undefined
  if (requestedDestination.startsWith('//'))
    return undefined

  if (policy.kind === 'image' && /^(?:\/|\.\/)/.test(requestedDestination))
    return requestedDestination
  if (policy.kind === 'link' && /^(?:#|\/|\.\.?\/)/.test(requestedDestination))
    return requestedDestination

  try {
    const url = new URL(requestedDestination)
    if (policy.kind === 'link' && ['http:', 'https:', 'mailto:'].includes(url.protocol))
      return url.href
    if (
      policy.kind === 'image'
      && url.protocol === 'https:'
      && policy.allowedImageOrigins.includes(url.origin)
    ) {
      return url.href
    }
  }
  catch {
    return undefined
  }
  return undefined
}

function nextMarkerIndex(source: string, startIndex: number): number {
  const markerIndexes = ['![', '[', '**', '*', '`']
    .map(marker => source.indexOf(marker, startIndex))
    .filter(index => index >= 0)
  return markerIndexes.length > 0 ? Math.min(...markerIndexes) : source.length
}

// AI modified: Markdown becomes a typed rendering tree, so raw HTML never enters an innerHTML sink.
export function readMarkdownInline(
  source: string,
  allowedImageOrigins: readonly string[] = [],
): MarkdownInline[] {
  const nodes: MarkdownInline[] = []
  let cursor = 0

  while (cursor < source.length) {
    if (source.startsWith('![', cursor) || source.startsWith('[', cursor)) {
      const isImage = source.startsWith('![', cursor)
      const labelStart = cursor + (isImage ? 2 : 1)
      const labelEnd = source.indexOf('](', labelStart)
      const destinationEnd = labelEnd >= 0 ? source.indexOf(')', labelEnd + 2) : -1
      if (labelEnd >= 0 && destinationEnd >= 0) {
        const label = source.slice(labelStart, labelEnd)
        const destination = source.slice(labelEnd + 2, destinationEnd)
        if (isImage) {
          nodes.push({
            kind: 'image',
            alt: label,
            source: safeDestination(destination, { kind: 'image', allowedImageOrigins }),
          })
        }
        else {
          nodes.push({
            kind: 'link',
            children: readMarkdownInline(label, allowedImageOrigins),
            href: safeDestination(destination, { kind: 'link', allowedImageOrigins }),
          })
        }
        cursor = destinationEnd + 1
        continue
      }
    }

    if (source.startsWith('**', cursor)) {
      const end = source.indexOf('**', cursor + 2)
      if (end > cursor + 2) {
        nodes.push({
          kind: 'strong',
          children: readMarkdownInline(source.slice(cursor + 2, end), allowedImageOrigins),
        })
        cursor = end + 2
        continue
      }
    }

    if (source[cursor] === '*') {
      const end = source.indexOf('*', cursor + 1)
      if (end > cursor + 1) {
        nodes.push({
          kind: 'emphasis',
          children: readMarkdownInline(source.slice(cursor + 1, end), allowedImageOrigins),
        })
        cursor = end + 1
        continue
      }
    }

    if (source[cursor] === '`') {
      const end = source.indexOf('`', cursor + 1)
      if (end > cursor + 1) {
        nodes.push({ kind: 'code', text: source.slice(cursor + 1, end) })
        cursor = end + 1
        continue
      }
    }

    const textEnd = Math.max(nextMarkerIndex(source, cursor + 1), cursor + 1)
    nodes.push({ kind: 'text', text: source.slice(cursor, textEnd) })
    cursor = textEnd
  }

  return nodes
}

export function readMarkdown(
  source: string,
  allowedImageOrigins: readonly string[] = [],
): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  const paragraphLines: string[] = []
  let listEntries: MarkdownInline[][] = []
  let listIsOrdered = false
  let fencedLanguage: string | undefined
  let fencedLines: string[] = []

  const flushParagraph = () => {
    if (paragraphLines.length === 0)
      return
    blocks.push({
      kind: 'paragraph',
      lines: paragraphLines.splice(0).map(line => readMarkdownInline(line, allowedImageOrigins)),
    })
  }
  const flushList = () => {
    if (listEntries.length === 0)
      return
    blocks.push({ kind: 'list', ordered: listIsOrdered, entries: listEntries })
    listEntries = []
  }

  for (const line of source.replace(/\r\n?/g, '\n').split('\n')) {
    const fence = /^```([\w-]*)\s*$/.exec(line)
    if (fencedLanguage !== undefined) {
      if (fence) {
        blocks.push({ kind: 'code', language: fencedLanguage, source: fencedLines.join('\n') })
        fencedLanguage = undefined
        fencedLines = []
      }
      else {
        fencedLines.push(line)
      }
      continue
    }
    if (fence) {
      flushParagraph()
      flushList()
      fencedLanguage = fence[1] ?? ''
      continue
    }

    if (line.trim() === '') {
      flushParagraph()
      flushList()
      continue
    }

    // AI modified: prefix-only matches avoid ambiguous backtracking on attacker-controlled long lines.
    const headingMarker = /^(#{1,6})[ \t]/.exec(line)
    const headingText = headingMarker ? line.slice(headingMarker[0].length).trimStart() : ''
    if (headingMarker && headingText) {
      flushParagraph()
      flushList()
      blocks.push({
        kind: 'heading',
        level: headingMarker[1]?.length ?? 1,
        children: readMarkdownInline(headingText, allowedImageOrigins),
      })
      continue
    }

    if (/^[ \t]*(?:-{3,}|_{3,}|\*{3,})[ \t]*$/.test(line)) {
      flushParagraph()
      flushList()
      blocks.push({ kind: 'separator' })
      continue
    }

    const quote = /^>\s?(.*)$/.exec(line)
    if (quote) {
      flushParagraph()
      flushList()
      blocks.push({
        kind: 'quote',
        children: readMarkdownInline(quote[1] ?? '', allowedImageOrigins),
      })
      continue
    }

    const unorderedMarker = /^[ \t]*[-+*][ \t]/.exec(line)
    const orderedMarker = /^[ \t]*\d+[.)][ \t]/.exec(line)
    const listMarker = orderedMarker ?? unorderedMarker
    const listEntrySource = listMarker ? line.slice(listMarker[0].length).trimStart() : ''
    if (listMarker && listEntrySource) {
      flushParagraph()
      const isOrdered = Boolean(orderedMarker)
      if (listEntries.length > 0 && listIsOrdered !== isOrdered)
        flushList()
      listIsOrdered = isOrdered
      listEntries.push(readMarkdownInline(listEntrySource, allowedImageOrigins))
      continue
    }

    flushList()
    paragraphLines.push(line)
  }

  if (fencedLanguage !== undefined)
    blocks.push({ kind: 'code', language: fencedLanguage, source: fencedLines.join('\n') })
  flushParagraph()
  flushList()
  return blocks
}
