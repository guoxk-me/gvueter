// @env node
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'

const projectRoot = resolve(import.meta.dirname, '..')
const requiredDocuments = [
  'README.md',
  'AGENTS.md',
  'docs/admin-architecture.md',
  'docs/deployment.md',
  'docs/testing.md',
  'docs/pwa.md',
  'docs/runbook.md',
  'docs/rollback.md',
  'docs/security.md',
]
const missingDocuments = requiredDocuments.filter(fileName => !existsSync(resolve(projectRoot, fileName)))
const markdownFiles = execFileSync('git', [
  'ls-files',
  '--cached',
  '--others',
  '--exclude-standard',
  '*.md',
], { cwd: projectRoot, encoding: 'utf8' }).split('\n').filter(Boolean)
const brokenLinks: string[] = []

for (const fileName of markdownFiles) {
  if (!existsSync(resolve(projectRoot, fileName)))
    continue
  const source = readFileSync(resolve(projectRoot, fileName), 'utf8')
  for (const match of source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const rawTarget = match[1]?.split('#', 1)[0]
    if (!rawTarget || rawTarget.startsWith('/') || /^[a-z][\d+.a-z-]*:/i.test(rawTarget))
      continue
    const target = decodeURIComponent(rawTarget.replace(/^<|>$/g, ''))
    if (!existsSync(resolve(projectRoot, dirname(fileName), target)))
      brokenLinks.push(`${fileName}: ${target}`)
  }
}

if (missingDocuments.length || brokenLinks.length)
  throw new Error(`Documentation mismatch: ${[...missingDocuments, ...brokenLinks].join(', ')}`)

// AI modified: only retained architecture and deployment documents participate in the skeleton gate.
process.stdout.write(`Documentation gate passed for ${markdownFiles.length} Markdown files.\n`)
