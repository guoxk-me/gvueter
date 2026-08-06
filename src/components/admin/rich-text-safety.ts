export interface RichTextSafetyPolicy {
  allowedImageOrigins?: readonly string[]
}

// AI modified: the auditable allowlist is exported so client tests and backend contracts can use the same vocabulary.
export const RICH_TEXT_ALLOWED_TAGS = [
  'A',
  'BLOCKQUOTE',
  'BR',
  'CODE',
  'EM',
  'H1',
  'H2',
  'H3',
  'IMG',
  'LI',
  'OL',
  'P',
  'PRE',
  'S',
  'SPAN',
  'STRONG',
  'U',
  'UL',
] as const

export const RICH_TEXT_ALLOWED_ATTRIBUTES = {
  global: ['class'],
  A: ['href', 'rel', 'target'],
  IMG: ['src', 'alt', 'loading'],
} as const

const allowedTags = new Set<string>(RICH_TEXT_ALLOWED_TAGS)

function safeUrl(
  value: string,
  kind: 'image' | 'link',
  allowedImageOrigins: readonly string[],
): string | undefined {
  const requestedUrl = value.trim()
  if (!requestedUrl || [...requestedUrl].some((character) => character.charCodeAt(0) < 32))
    return undefined
  // AI modified: reject backslashes because special-scheme URL parsers can reinterpret them as host separators.
  if (requestedUrl.includes('\\')) return undefined
  if (requestedUrl.startsWith('//')) return undefined
  if (kind === 'link' && /^(?:#|\/|\.\/|\.\.\/)/.test(requestedUrl)) return requestedUrl
  if (kind === 'image' && /^(?:\/|\.\/)/.test(requestedUrl)) return requestedUrl

  try {
    const url = new URL(requestedUrl)
    if (kind === 'link' && ['http:', 'https:', 'mailto:'].includes(url.protocol)) return url.href
    if (kind === 'image' && url.protocol === 'https:' && allowedImageOrigins.includes(url.origin))
      return url.href
  } catch {
    return undefined
  }
  return undefined
}

function safeClassNames(className: string): string {
  return className
    .split(/\s+/)
    .filter((name) =>
      /^(?:ql-align-(?:center|justify|right)|ql-code-block|ql-indent-[1-8])$/.test(name),
    )
    .join(' ')
}

function escapedText(html: string): string {
  return html.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character,
  )
}

// AI modified: the client accepts only the Quill subset documented by the component contract.
export function sanitizeRichTextHtml(html: string, policy: RichTextSafetyPolicy = {}): string {
  if (typeof DOMParser === 'undefined') return escapedText(html)

  const document = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const body = document.body
  const allowedImageOrigins = policy.allowedImageOrigins ?? []

  for (const element of body.querySelectorAll('*')) {
    if (!allowedTags.has(element.tagName)) {
      if (['IFRAME', 'SCRIPT', 'STYLE', 'TEMPLATE'].includes(element.tagName)) {
        element.remove()
      } else {
        element.replaceWith(...element.childNodes)
      }
      continue
    }

    const originalClass = element.getAttribute('class') ?? ''
    const originalHref = element.getAttribute('href') ?? ''
    const originalSource = element.getAttribute('src') ?? ''
    const originalAlt = element.getAttribute('alt') ?? ''
    for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name)

    const className = safeClassNames(originalClass)
    if (className) element.setAttribute('class', className)

    if (element instanceof HTMLAnchorElement) {
      const href = safeUrl(originalHref, 'link', allowedImageOrigins)
      if (href) {
        element.setAttribute('href', href)
        element.setAttribute('rel', 'noopener noreferrer nofollow')
        if (/^https?:/i.test(href)) element.setAttribute('target', '_blank')
      }
    }

    if (element instanceof HTMLImageElement) {
      const source = safeUrl(originalSource, 'image', allowedImageOrigins)
      const alt = originalAlt
      if (!source) {
        element.replaceWith(
          document.createTextNode(alt ? `[Image blocked: ${alt}]` : '[Image blocked]'),
        )
      } else {
        element.setAttribute('src', source)
        element.setAttribute('alt', alt)
        element.setAttribute('loading', 'lazy')
      }
    }
  }

  return body.innerHTML
}
