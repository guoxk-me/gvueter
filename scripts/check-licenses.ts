import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import process from 'node:process'

interface LicenseDependency {
  name: string
  versions: string[]
}

interface LicenseReview {
  packageName: string
  versions: string[]
  license: string
  owner: string
  issue: string
  reason: string
  expiresOn: string
}

interface LicensePolicy {
  schemaVersion: 1
  allow: string[]
  denyPatterns: string[]
  reviews: LicenseReview[]
}

type LicenseInventory = Record<string, LicenseDependency[]>

const policy = JSON.parse(readFileSync('license-policy.json', 'utf8')) as LicensePolicy
if (policy.schemaVersion !== 1)
  throw new Error('Unsupported license policy schema version.')

const inventoryRun = spawnSync(
  process.platform === 'win32' ? 'corepack.cmd' : 'corepack',
  ['pnpm', 'licenses', 'list', '--json'],
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
)
if (inventoryRun.error || inventoryRun.status !== 0)
  throw new Error(inventoryRun.error?.message ?? inventoryRun.stderr)

const inventory = JSON.parse(inventoryRun.stdout) as LicenseInventory
const allowedLicenses = new Set(policy.allow)
const reviewIndex = new Map(
  policy.reviews.map(review => [`${review.license}:${review.packageName}`, review]),
)
const violations: string[] = []
let reviewedDependencyCount = 0
let dependencyCount = 0

for (const [license, dependencies] of Object.entries(inventory)) {
  for (const dependency of dependencies) {
    dependencyCount += 1
    if (allowedLicenses.has(license))
      continue

    const review = reviewIndex.get(`${license}:${dependency.name}`)
    if (!review && policy.denyPatterns.some(pattern => license.includes(pattern))) {
      violations.push(`${dependency.name}@${dependency.versions.join(',')}: denied license ${license}`)
      continue
    }
    if (!review) {
      violations.push(`${dependency.name}@${dependency.versions.join(',')}: ${license} requires review`)
      continue
    }
    const reviewedVersions = new Set(review.versions)
    const unreviewedVersions = dependency.versions.filter(version => !reviewedVersions.has(version))
    const expiresAt = Date.parse(`${review.expiresOn}T23:59:59Z`)
    if (!review.owner || !review.issue || !review.reason || !Number.isFinite(expiresAt)) {
      violations.push(`${dependency.name}: license review metadata is incomplete`)
      continue
    }
    if (Date.now() > expiresAt) {
      violations.push(`${dependency.name}: license review expired on ${review.expiresOn}`)
      continue
    }
    if (unreviewedVersions.length > 0) {
      violations.push(`${dependency.name}: unreviewed ${license} version(s) ${unreviewedVersions.join(',')}`)
      continue
    }
    reviewedDependencyCount += 1
  }
}

if (violations.length > 0)
  throw new Error(`License policy failed:\n${violations.join('\n')}`)

// AI modified: all direct/transitive production and development packages must be allowed or explicitly reviewed.
process.stdout.write(
  `License policy passed for ${dependencyCount} package records; ${reviewedDependencyCount} remain under time-bounded review.\n`,
)
