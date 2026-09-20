import type { JSONReport } from 'knip'
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

type BaselineIssueCategory = 'files' | 'exports' | 'types'

interface BaselineGroup {
  scope: string
  owner: string
  issue: string
  reason: string
  expiresOn: string
  issueKeys: string[]
}

interface KnipBaseline {
  schemaVersion: 1
  groups: BaselineGroup[]
}

const issueCategories: BaselineIssueCategory[] = ['files', 'exports', 'types']
const knipMain = fileURLToPath(import.meta.resolve('knip'))
const knipExecutable = resolve(dirname(knipMain), '../bin/knip.js')
const knipRun = spawnSync(process.execPath, [knipExecutable, '--reporter', 'json'], {
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
})

if (knipRun.error || (knipRun.status !== 0 && knipRun.status !== 1)) {
  console.error(knipRun.error ?? knipRun.stderr)
  process.exit(1)
}

const report = JSON.parse(knipRun.stdout) as JSONReport
const currentIssues = new Set<string>()
const immediateIssues = new Set<string>()

for (const entry of report.issues) {
  for (const category of issueCategories) {
    for (const issue of entry[category] ?? []) {
      const issueKey = category === 'files'
        ? `${category}:${entry.file}`
        : `${category}:${entry.file}:${issue.name}`
      currentIssues.add(issueKey)
    }
  }
  // AI modified: only existing files/exports/types may be grandfathered; dependency and resolution issues fail now.
  for (const [category, issues] of Object.entries(entry)) {
    if (category === 'file' || issueCategories.includes(category as BaselineIssueCategory))
      continue
    if (!Array.isArray(issues))
      continue
    for (const issue of issues) {
      if (category === 'owners')
        continue
      immediateIssues.add(`${category}:${entry.file}:${JSON.stringify(issue)}`)
    }
  }
}

if (process.argv.includes('--capture')) {
  // AI modified: capture is an explicit review aid, never part of the CI gate.
  const issues = [...currentIssues].sort()
  const groups: BaselineGroup[] = [
    {
      scope: 'optional-ui-stock',
      owner: 'template-maintainers',
      issue: 'PENDING_GITHUB_ISSUE_AUTHORIZATION',
      reason: 'Optional upstream UI primitives are retained for template extension, not yet V1 stable exports.',
      expiresOn: '2026-10-16',
      issueKeys: issues.filter(issue => issue.includes(':src/components/ui/')),
    },
    {
      scope: 'mock-compatibility',
      owner: 'template-maintainers',
      issue: 'PENDING_GITHUB_ISSUE_AUTHORIZATION',
      reason: 'Mock handler exports are retained until their test and registry consumers are reviewed.',
      expiresOn: '2026-10-16',
      issueKeys: issues.filter(issue => issue.includes(':src/mocks/')),
    },
    {
      scope: 'other-existing-exports',
      owner: 'template-maintainers',
      issue: 'PENDING_GITHUB_ISSUE_AUTHORIZATION',
      reason: 'Existing public-looking exports require per-module cleanup rather than automatic removal.',
      expiresOn: '2026-10-16',
      issueKeys: issues.filter(issue => !issue.includes(':src/components/ui/') && !issue.includes(':src/mocks/')),
    },
  ]
  writeFileSync('knip-baseline.json', `${JSON.stringify({ schemaVersion: 1, groups }, null, 2)}\n`)
  console.info(`Captured ${issues.length} existing Knip issues for explicit review.`)
  process.exit(0)
}

const baseline = JSON.parse(readFileSync('knip-baseline.json', 'utf8')) as KnipBaseline
if (baseline.schemaVersion !== 1)
  throw new Error('Unsupported Knip baseline schema version.')

const approvedIssues = new Set<string>()
const expiredIssues = new Set<string>()
for (const group of baseline.groups) {
  const expiresAt = Date.parse(`${group.expiresOn}T23:59:59Z`)
  if (!group.scope || !group.owner || !group.issue || !group.reason || !Number.isFinite(expiresAt))
    throw new Error(`Knip baseline group ${group.scope || '(unnamed)'} lacks required review metadata.`)
  for (const issueKey of group.issueKeys) {
    if (approvedIssues.has(issueKey))
      throw new Error(`Duplicate Knip baseline issue: ${issueKey}`)
    approvedIssues.add(issueKey)
    if (Date.now() > expiresAt && currentIssues.has(issueKey))
      expiredIssues.add(issueKey)
  }
}

const newIssues = [...currentIssues].filter(issue => !approvedIssues.has(issue))
const retiredIssues = [...approvedIssues].filter(issue => !currentIssues.has(issue))
for (const [label, issues] of [
  ['new', newIssues],
  ['expired', [...expiredIssues]],
  ['immediate', [...immediateIssues]],
] as const) {
  if (issues.length)
    console.error(`Knip ${label} issues (${issues.length}):\n${issues.slice(0, 30).join('\n')}`)
}
if (retiredIssues.length)
  console.info(`Knip baseline cleanup candidates: ${retiredIssues.length} resolved issue(s).`)

if (newIssues.length || expiredIssues.size || immediateIssues.size)
  process.exitCode = 1
else
  console.info(`Knip baseline passed: ${currentIssues.size} existing exact issue(s), no new or expired issues.`)
