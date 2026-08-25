export interface LocaleMessageTree {
  readonly [messageKey: string]: string | LocaleMessageTree
}

export interface PseudoLocaleOptions {
  protectedTerms?: readonly string[]
}

// AI modified: protected tool names reflect the current official Vite toolchain.
const DEFAULT_PROTECTED_TERMS = [
  'Admin Panel',
  'Tailwind CSS',
  'shadcn-vue',
  'JavaScript',
  'TypeScript',
  'DataTable',
  'ProTable',
  'Markdown',
  'VitePress',
  'Vue.js',
  'Pinia',
  'Reka',
  'Vue',
  'Vite',
] as const

const PSEUDO_LETTERS: Readonly<Record<string, string>> = {
  A: 'Å',
  B: 'Ɓ',
  C: 'Ç',
  D: 'Ð',
  E: 'Ë',
  F: 'Ƒ',
  G: 'Ĝ',
  H: 'Ĥ',
  I: 'Ï',
  J: 'Ĵ',
  K: 'Ķ',
  L: 'Ŀ',
  M: 'Ṁ',
  N: 'Ñ',
  O: 'Ö',
  P: 'Þ',
  Q: 'Ǫ',
  R: 'Ř',
  S: 'Š',
  T: 'Ţ',
  U: 'Ü',
  V: 'Ṽ',
  W: 'Ŵ',
  X: 'Ẍ',
  Y: 'Ŷ',
  Z: 'Ž',
  a: 'å',
  b: 'ƀ',
  c: 'ç',
  d: 'đ',
  e: 'ë',
  f: 'ƒ',
  g: 'ĝ',
  h: 'ĥ',
  i: 'ï',
  j: 'ĵ',
  k: 'ķ',
  l: 'ŀ',
  m: 'ṁ',
  n: 'ñ',
  o: 'ö',
  p: 'þ',
  q: 'ǫ',
  r: 'ř',
  s: 'š',
  t: 'ţ',
  u: 'ü',
  v: 'ṽ',
  w: 'ŵ',
  x: 'ẍ',
  y: 'ŷ',
  z: 'ž',
}

function escapeRegularExpression(term: string) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getProtectedTokenPattern(options: PseudoLocaleOptions = {}) {
  const protectedTerms = [...DEFAULT_PROTECTED_TERMS, ...(options.protectedTerms ?? [])]
    .filter(term => term.length > 0)
    .sort((leftTerm, rightTerm) => rightTerm.length - leftTerm.length)
    .map(escapeRegularExpression)

  const protectedSources = [
    String.raw`[A-Za-z0-9._+-]+\{(?:'@'|"@")\}[A-Za-z0-9.-]+`,
    String.raw`https?:\/\/[^\s<>"']+`,
    String.raw`\x60[^\x60\r\n]+\x60`,
    String.raw`<\/?[A-Za-z][^<>]*>`,
    String.raw`\{(?:'[^']*'|"[^"]*"|[^{}])+\}`,
    String.raw`&(?:[A-Za-z][A-Za-z0-9]+|#[0-9]+|#x[0-9A-Fa-f]+);`,
    ...protectedTerms,
    String.raw`\b[A-Z][A-Z0-9]*(?:[_-][A-Z0-9]+)*\b`,
    String.raw`\b(?:[a-z]+[A-Z][A-Za-z0-9]*|[A-Z][a-z]+(?:[A-Z][A-Za-z0-9]*)+)\b`,
    String.raw`\b[A-Za-z_$][\w$-]*(?:\.[A-Za-z_$][\w$-]*)+\b`,
    String.raw`(?:\/[A-Za-z0-9_.-]+){2,}`,
  ]

  return new RegExp(protectedSources.join('|'), 'g')
}

function getPseudoText(messagePart: string) {
  return messagePart.replace(/[a-z]/gi, character => PSEUDO_LETTERS[character] ?? character)
}

function getMessageParts(message: string, options: PseudoLocaleOptions) {
  const messageParts: Array<{ isProtected: boolean, text: string }> = []
  const protectedTokenPattern = getProtectedTokenPattern(options)
  let ordinaryStart = 0

  for (const tokenMatch of message.matchAll(protectedTokenPattern)) {
    const tokenStart = tokenMatch.index
    if (tokenStart > ordinaryStart) {
      messageParts.push({
        isProtected: false,
        text: message.slice(ordinaryStart, tokenStart),
      })
    }

    messageParts.push({ isProtected: true, text: tokenMatch[0] })
    ordinaryStart = tokenStart + tokenMatch[0].length
  }

  if (ordinaryStart < message.length) {
    messageParts.push({ isProtected: false, text: message.slice(ordinaryStart) })
  }

  return messageParts
}

export function getProtectedMessageTokens(message: string, options: PseudoLocaleOptions = {}) {
  return [...message.matchAll(getProtectedTokenPattern(options))].map(tokenMatch => tokenMatch[0])
}

export function createPseudoMessage(message: string, options: PseudoLocaleOptions = {}) {
  const messageParts = getMessageParts(message, options)
  const ordinaryLength = messageParts.reduce(
    (characterCount, messagePart) =>
      characterCount + (messagePart.isProtected ? 0 : [...messagePart.text].length),
    0,
  )
  const hasOrdinaryText = messageParts.some(
    messagePart => !messagePart.isProtected && /\p{L}/u.test(messagePart.text),
  )

  if (!hasOrdinaryText)
    return message

  // AI modified: preserve executable message tokens while expanding only human-readable copy for layout tests.
  const extraCharacterCount = Math.max(1, Math.floor(ordinaryLength / 2))
  const shouldAddBoundaryMarkers = extraCharacterCount >= 2
  const fillerCharacterCount = extraCharacterCount - (shouldAddBoundaryMarkers ? 2 : 0)
  const pseudoText = messageParts
    .map(messagePart =>
      messagePart.isProtected ? messagePart.text : getPseudoText(messagePart.text),
    )
    .join('')
  const expandedText = `${pseudoText}${'·'.repeat(fillerCharacterCount)}`

  return shouldAddBoundaryMarkers ? `［${expandedText}］` : expandedText
}

export function createPseudoLocale(
  messages: LocaleMessageTree,
  options: PseudoLocaleOptions = {},
): LocaleMessageTree {
  const pseudoMessages: Record<string, string | LocaleMessageTree> = {}

  for (const [messageKey, message] of Object.entries(messages)) {
    pseudoMessages[messageKey]
      = typeof message === 'string'
        ? createPseudoMessage(message, options)
        : createPseudoLocale(message, options)
  }

  return pseudoMessages
}

export function getLocaleMessageKeys(messages: LocaleMessageTree, parentKey = ''): string[] {
  const messageKeys: string[] = []

  for (const [messageKey, message] of Object.entries(messages)) {
    const qualifiedKey = parentKey ? `${parentKey}.${messageKey}` : messageKey
    if (typeof message === 'string') {
      messageKeys.push(qualifiedKey)
      continue
    }

    messageKeys.push(...getLocaleMessageKeys(message, qualifiedKey))
  }

  return messageKeys.sort((leftKey, rightKey) => leftKey.localeCompare(rightKey))
}
