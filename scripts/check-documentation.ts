// @env node
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'

interface ProjectManifest {
  scripts?: Record<string, string>
}

const projectRoot = resolve(import.meta.dirname, '..')
const manifest = JSON.parse(
  readFileSync(resolve(projectRoot, 'package.json'), 'utf8'),
) as ProjectManifest
const packageScripts = new Set(Object.keys(manifest.scripts ?? {}))
const operationalDocuments = new Set([
  'AGENTS.md',
  'README.md',
  'docs/performance.md',
  'docs/product/03-technical-development.md',
  'docs/pwa.md',
  'docs/runbook.md',
  'docs/testing.md',
])
const qualityCommandFragment = [
  '<!-- quality-commands:start -->',
  '- `pnpm run verify` runs the reproducible PR and local quality gate.',
  '- `pnpm run release:check` adds the Mock build, three-browser E2E, and guaranteed production artifact restoration.',
  '<!-- quality-commands:end -->',
].join('\n')
const generatedFragmentDocuments = ['README.md', 'docs/testing.md']
const violations: string[] = []

function getRepositoryMarkdownFiles(): string[] {
  return execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '*.md'],
    { cwd: projectRoot, encoding: 'utf8' },
  )
    .split('\n')
    .filter(Boolean)
}

function getLocalLinkTarget(rawTarget: string): string | undefined {
  const target = rawTarget.trim().replace(/^<|>$/g, '').split('#', 1)[0]
  if (!target || target.startsWith('/') || /^[a-z][a-z\d+.-]*:/i.test(target))
    return undefined

  try {
    return decodeURIComponent(target)
  }
  catch {
    return target
  }
}

function inspectMarkdownLinks(fileName: string, source: string): void {
  for (const match of source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = getLocalLinkTarget(match[1] ?? '')
    if (!target)
      continue
    if (!existsSync(resolve(projectRoot, dirname(fileName), target)))
      violations.push(`${fileName}: missing internal link target ${target}`)
  }
}

function inspectScriptReferences(fileName: string, source: string): void {
  if (!operationalDocuments.has(fileName))
    return

  for (const match of source.matchAll(/`pnpm run ([\w:-]+)/g)) {
    const scriptName = match[1]
    if (scriptName && !packageScripts.has(scriptName))
      violations.push(`${fileName}: references missing package script ${scriptName}`)
  }
}

function getEnvironmentNames(source: string, pattern: RegExp): string[] {
  return [...source.matchAll(pattern)].flatMap(match => match[1] ? [match[1]] : [])
}

for (const fileName of getRepositoryMarkdownFiles()) {
  const source = readFileSync(resolve(projectRoot, fileName), 'utf8')
  inspectMarkdownLinks(fileName, source)
  inspectScriptReferences(fileName, source)
}

for (const fileName of generatedFragmentDocuments) {
  const source = readFileSync(resolve(projectRoot, fileName), 'utf8')
  if (!source.includes(qualityCommandFragment))
    violations.push(`${fileName}: generated quality command fragment is missing or stale`)
}

const exampleEnvironmentNames = getEnvironmentNames(
  readFileSync(resolve(projectRoot, '.env.example'), 'utf8'),
  /^([A-Z][A-Z\d_]*)=/gm,
).sort()
const declaredEnvironmentNames = getEnvironmentNames(
  readFileSync(resolve(projectRoot, 'env.d.ts'), 'utf8'),
  /readonly (VITE_[A-Z\d_]+)\??:/g,
).sort()

if (exampleEnvironmentNames.join('\n') !== declaredEnvironmentNames.join('\n')) {
  violations.push(
    `.env.example and env.d.ts differ:\nexample=${exampleEnvironmentNames.join(',')}\ndeclared=${declaredEnvironmentNames.join(',')}`,
  )
}

if (violations.length > 0)
  throw new Error(`Documentation gate failed:\n${violations.join('\n')}`)

// AI modified: documentation drift is checked offline across links, scripts, generated commands, and public env names.
process.stdout.write(`Documentation gate passed for ${getRepositoryMarkdownFiles().length} Markdown files.\n`)
