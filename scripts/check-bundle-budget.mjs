import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import { gzipSync } from 'node:zlib'

const projectRoot = resolve(import.meta.dirname, '..')
const budget = JSON.parse(
  await readFile(resolve(projectRoot, 'src/lib/performance-budget.json'), 'utf8'),
)
const manifest = JSON.parse(
  await readFile(resolve(projectRoot, 'dist/.vite/manifest.json'), 'utf8'),
)
const javascriptAssets = [
  ...new Set(
    Object.values(manifest)
      .map(entry => entry.file)
      .filter(file => typeof file === 'string' && file.endsWith('.js')),
  ),
]
const entryAssets = new Set(
  Object.values(manifest)
    .filter(entry => entry.isEntry)
    .map(entry => entry.file),
)
const violations = []
const isMockBuild = process.env.VITE_ENABLE_MOCKS === 'true'
const browserMockEntry = manifest['src/mocks/browser.ts']
const mockWorkerPath = resolve(projectRoot, 'dist/mockServiceWorker.js')
const hasMockWorker = await readFile(mockWorkerPath).then(
  () => true,
  (error) => {
    if (error.code === 'ENOENT')
      return false
    throw error
  },
)

// AI modified: production artifacts must not expose demo handlers or the service worker registration surface.
if (isMockBuild) {
  if (!browserMockEntry)
    violations.push('Mock build is missing the browser handler entry.')
  if (!hasMockWorker)
    violations.push('Mock build is missing mockServiceWorker.js.')
}
else {
  if (browserMockEntry)
    violations.push('Production build contains the browser Mock handler entry.')
  if (hasMockWorker)
    violations.push('Production build contains mockServiceWorker.js.')
}

// AI modified: size budgets govern deployable production assets; Mock builds only prove isolation boundaries.
if (!isMockBuild) {
  for (const asset of javascriptAssets) {
    const source = await readFile(resolve(projectRoot, 'dist', asset))
    const compressedBytes = gzipSync(source).byteLength
    const allowedBytes = entryAssets.has(asset) ? budget.entryGzipBytes : budget.asyncChunkGzipBytes

    if (compressedBytes > allowedBytes) {
      violations.push(`${asset}: ${compressedBytes} gzip bytes exceeds ${allowedBytes}`)
    }
  }
}

if (violations.length > 0) {
  throw new Error(`Bundle performance budget failed:\n${violations.join('\n')}`)
}

// AI modified: keep CI output compact while distinguishing production budgets from Mock isolation evidence.
process.stdout.write(
  isMockBuild
    ? 'Mock artifact boundary passed.\n'
    : `Bundle budget passed for ${javascriptAssets.length} JavaScript assets.\n`,
)
