import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import enUS from '../src/i18n/locales/en-US.ts'
import zhCN from '../src/i18n/locales/zh-CN.ts'

interface LocaleMessages {
  [key: string]: string | LocaleMessages
}

interface LocaleLeaf {
  key: string
  message: string
}

const projectRoot = resolve(import.meta.dirname, '..')
const sourceRoot = resolve(projectRoot, 'src')
const sourceExtensions = /\.(?:ts|tsx|vue)$/
const localeDirectory = resolve(sourceRoot, 'i18n/locales')

function getLocaleLeaves(messages: LocaleMessages, parentKey = ''): LocaleLeaf[] {
  return Object.entries(messages).flatMap(([messageKey, message]) => {
    const key = parentKey ? `${parentKey}.${messageKey}` : messageKey
    return typeof message === 'string'
      ? [{ key, message }]
      : getLocaleLeaves(message, key)
  })
}

function getPlaceholderSignature(message: string): string[] {
  const placeholders = new Set<string>()
  for (const match of message.matchAll(/\{([^{}]+)\}/g)) {
    const placeholder = match[1]?.trim()
    if (!placeholder || placeholder.startsWith('\''))
      continue
    const variableName = placeholder.split(',')[0]?.trim()
    if (!variableName)
      continue
    const variableType = /^\d+$/.test(variableName) ? 'list' : 'named'
    placeholders.add(`${variableType}:${variableName}`)
  }
  return [...placeholders].sort()
}

function getApplicationSource(directory: string): string[] {
  const sources: string[] = []
  for (const entryName of readdirSync(directory)) {
    const entryPath = resolve(directory, entryName)
    if (entryPath.startsWith(localeDirectory))
      continue
    if (statSync(entryPath).isDirectory()) {
      sources.push(...getApplicationSource(entryPath))
      continue
    }
    if (sourceExtensions.test(entryName))
      sources.push(readFileSync(entryPath, 'utf8'))
  }
  return sources
}

function hasStaticOrDynamicReference(messageKey: string, source: string): boolean {
  if (source.includes(messageKey))
    return true
  const keySegments = messageKey.split('.')
  for (let segmentCount = 1; segmentCount < keySegments.length; segmentCount += 1) {
    const dynamicPrefix = `${keySegments.slice(0, segmentCount).join('.')}.$\{`
    if (source.includes(dynamicPrefix))
      return true
  }
  return false
}

const englishLeaves = getLocaleLeaves(enUS as LocaleMessages)
const chineseLeaves = getLocaleLeaves(zhCN as LocaleMessages)
const englishMessages = new Map(englishLeaves.map(leaf => [leaf.key, leaf.message]))
const chineseMessages = new Map(chineseLeaves.map(leaf => [leaf.key, leaf.message]))
const violations: string[] = []

for (const messageKey of new Set([...englishMessages.keys(), ...chineseMessages.keys()])) {
  const englishMessage = englishMessages.get(messageKey)
  const chineseMessage = chineseMessages.get(messageKey)
  if (englishMessage === undefined || chineseMessage === undefined) {
    violations.push(`${messageKey}: missing from ${englishMessage === undefined ? 'en-US' : 'zh-CN'}`)
    continue
  }
  const englishSignature = getPlaceholderSignature(englishMessage)
  const chineseSignature = getPlaceholderSignature(chineseMessage)
  if (englishSignature.join('|') !== chineseSignature.join('|')) {
    violations.push(
      `${messageKey}: placeholder mismatch en-US=[${englishSignature.join(', ')}] zh-CN=[${chineseSignature.join(', ')}]`,
    )
  }
}

if (violations.length > 0)
  throw new Error(`Locale contract failed:\n${violations.join('\n')}`)

const applicationSource = getApplicationSource(sourceRoot).join('\n')
const reviewCandidates = englishLeaves
  .map(leaf => leaf.key)
  .filter(messageKey => !hasStaticOrDynamicReference(messageKey, applicationSource))

// AI modified: unused keys remain informational because static analysis cannot prove runtime registry usage.
process.stdout.write(
  `Locale contract passed for ${englishLeaves.length} keys; ${reviewCandidates.length} unused-key candidate(s) require manual review.\n`,
)
if (process.argv.includes('--report-unused') && reviewCandidates.length > 0) {
  process.stdout.write(`${reviewCandidates.join('\n')}\n`)
}
