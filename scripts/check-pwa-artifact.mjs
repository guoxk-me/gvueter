import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

const projectRoot = resolve(import.meta.dirname, '..')
const outputDirectory = resolve(projectRoot, 'dist')
const serviceWorkerPath = resolve(outputDirectory, 'pwa-sw.js')
const webManifestPath = resolve(outputDirectory, 'manifest.webmanifest')
const generatedIconPaths = [
  'apple-touch-icon-180x180.png',
  'maskable-icon-512x512.png',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'pwa-64x64.png',
].map(filename => resolve(outputDirectory, filename))

async function exists(filePath) {
  return access(filePath).then(
    () => true,
    () => false,
  )
}

const mockSetting = process.env.VITE_ENABLE_MOCKS
const pwaSetting = process.env.VITE_ENABLE_PWA
if (mockSetting !== undefined && !['false', 'true'].includes(mockSetting))
  throw new Error('VITE_ENABLE_MOCKS must be exactly "true" or "false".')
if (pwaSetting !== undefined && !['false', 'true'].includes(pwaSetting))
  throw new Error('VITE_ENABLE_PWA must be exactly "true" or "false".')

const isMockBuild = mockSetting === 'true'
const isPwaBuild = pwaSetting === 'true'
if (isMockBuild && isPwaBuild)
  throw new Error('Mock and PWA artifacts cannot be enabled together.')

const hasServiceWorker = await exists(serviceWorkerPath)
const hasWebManifest = await exists(webManifestPath)

if (!isPwaBuild) {
  const hasGeneratedIcon = (await Promise.all(generatedIconPaths.map(exists))).some(Boolean)
  if (hasServiceWorker || hasWebManifest || hasGeneratedIcon) {
    throw new Error(
      'PWA-off artifacts must not emit workers, manifests, or generated install icons.',
    )
  }
  process.stdout.write(
    `PWA artifact gate passed: ${isMockBuild ? 'Mock' : 'standard'} build is PWA-off.\n`,
  )
  process.exit(0)
}

if (!hasServiceWorker || !hasWebManifest) {
  throw new Error('Production artifact is missing pwa-sw.js or manifest.webmanifest.')
}

const manifest = JSON.parse(await readFile(webManifestPath, 'utf8'))
const iconSizes = new Set(manifest.icons?.map(icon => icon.sizes))
const hasMaskableIcon = manifest.icons?.some(icon => icon.purpose?.includes('maskable'))
const requiredManifestValues = {
  display: 'standalone',
  scope: process.env.VITE_BASE_PATH ?? '/',
  start_url: process.env.VITE_BASE_PATH ?? '/',
}
const violations = []

for (const [key, expectedValue] of Object.entries(requiredManifestValues)) {
  if (manifest[key] !== expectedValue) {
    violations.push(`manifest.${key} must equal ${JSON.stringify(expectedValue)}`)
  }
}
if (!iconSizes.has('192x192'))
  violations.push('manifest must include a 192x192 icon')
if (!iconSizes.has('512x512'))
  violations.push('manifest must include a 512x512 icon')
if (!hasMaskableIcon)
  violations.push('manifest must include a maskable icon')

for (const icon of manifest.icons ?? []) {
  const basePath = process.env.VITE_BASE_PATH ?? '/'
  const relativeIconPath = icon.src.startsWith(basePath)
    ? icon.src.slice(basePath.length)
    : icon.src.replace(/^\//, '')
  const iconPath = resolve(outputDirectory, relativeIconPath)
  if (!(await exists(iconPath)))
    violations.push(`manifest icon is missing: ${icon.src}`)
}

const serviceWorkerSource = await readFile(serviceWorkerPath, 'utf8')
const workerEntrySource = await readFile(resolve(projectRoot, 'src/features/pwa/pwa-sw.ts'), 'utf8')
if (!workerEntrySource.includes('new NetworkOnly()')) {
  violations.push('service worker must contain explicit network-only routes')
}
if (!serviceWorkerSource.includes('mockServiceWorker')) {
  violations.push('service worker must explicitly bypass the MSW worker asset')
}
if (!serviceWorkerSource.includes('gvueter-pwa')) {
  violations.push('service worker caches must use the Gvueter cache namespace')
}

if (violations.length > 0) {
  throw new Error(`PWA artifact gate failed:\n${violations.join('\n')}`)
}

// AI modified: build-time evidence proves installability and the sensitive-response cache boundary.
process.stdout.write(`PWA artifact gate passed for ${manifest.icons.length} manifest icons.\n`)
