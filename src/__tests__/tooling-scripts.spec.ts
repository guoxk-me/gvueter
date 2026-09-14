import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { parse as readYaml } from 'yaml'
import { inspectChartBoundary } from '../../scripts/check-chart-boundary'
import { inspectDoctorFiles } from '../../scripts/doctor'

const fixtureRoots: string[] = []

// AI modified: exercise the gate's actual filtering predicate with native Windows and POSIX paths.
describe('production API contract source boundary', () => {
  it('excludes test and Mock callers on every platform without excluding production calls', async () => {
    const gateUrl = pathToFileURL(resolve(import.meta.dirname, '../../scripts/check-runtime-api-contracts.mjs')).href
    const gate = await import(gateUrl) as { isProductionContractSource: (filePath: string) => boolean }
    for (const sourcePath of [
      '/repo/src/__tests__/api-contracts.spec.ts',
      '/repo/src/mocks/handlers/users.ts',
      String.raw`D:\a\gvueter\src\__tests__\api-contracts.spec.ts`,
      String.raw`D:\a\gvueter\src\mocks\handlers\users.ts`,
      '/repo/src/env.d.ts',
    ]) {
      expect(gate.isProductionContractSource(sourcePath), sourcePath).toBe(false)
    }
    for (const sourcePath of ['/repo/src/api/users.ts', String.raw`D:\a\gvueter\src\api\users.ts`, '/repo/src/features/mocks-history/Page.vue'])
      expect(gate.isProductionContractSource(sourcePath), sourcePath).toBe(true)
  })
})

async function createChartFixture(files: Record<string, string>): Promise<string> {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'gvueter-chart-boundary-'))
  fixtureRoots.push(fixtureRoot)

  for (const [fileName, source] of Object.entries(files)) {
    const filePath = resolve(fixtureRoot, 'src', fileName)
    await mkdir(resolve(filePath, '..'), { recursive: true })
    await writeFile(filePath, source, 'utf8')
  }

  return fixtureRoot
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map(fixtureRoot => rm(fixtureRoot, {
    force: true,
    recursive: true,
  })))
})

// AI modified: disposable configurations prove Doctor blocks unsafe settings without disclosing values.
async function createDoctorFixture(files: Record<string, string> = {}): Promise<string> {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'gvueter-doctor-'))
  fixtureRoots.push(fixtureRoot)
  const baselineFiles = {
    'package.json': JSON.stringify({ packageManager: 'pnpm@12.4.1', engines: { node: '>=24.18.0 <25' }, dependencies: { vue: 'catalog:' } }),
    '.node-version': '24.18.0',
    'pnpm-workspace.yaml': 'autoInstallPeers: false\ncatalog:\n  vue: 3.5.42\n',
    'pnpm-lock.yaml': '---\nlockfileVersion: "9.0"\nimporters:\n  .:\n    packageManagerDependencies:\n      pnpm:\n        specifier: 12.4.1\n---\nlockfileVersion: "9.0"\nsettings:\n  autoInstallPeers: false\ncatalogs:\n  default:\n    vue:\n      specifier: 3.5.42\nimporters:\n  .:\n    dependencies:\n      vue:\n        specifier: "catalog:"\n',
    '.env.example': 'VITE_ENABLE_MOCKS=false\nVITE_API_BASE_URL=/api',
    'env.d.ts': 'interface ImportMetaEnv {\nreadonly VITE_ENABLE_MOCKS?: "true" | "false"\nreadonly VITE_API_BASE_URL?: string\nreadonly VITE_NOTIFICATION_WS_URL?: string\nreadonly VITE_NAVIGATION_ALLOWED_ORIGINS?: string\n}',
    ...files,
  }
  await Promise.all(Object.entries(baselineFiles).map(([fileName, source]) => writeFile(resolve(fixtureRoot, fileName), source, 'utf8')))
  return fixtureRoot
}

describe('toolchain doctor fixtures', () => {
  it('rejects stale native pnpm runtime and unused catalog conflicts', async () => {
    const fixtureRoot = await createDoctorFixture({ 'pnpm-workspace.yaml': 'autoInstallPeers: false\ncatalog:\n  vue: 3.5.43' })
    const lockPath = resolve(fixtureRoot, 'pnpm-lock.yaml')
    await writeFile(lockPath, (await readFile(lockPath, 'utf8')).replace('specifier: 12.4.1', 'specifier: 12.4.0'))
    expect(inspectDoctorFiles(fixtureRoot).map(finding => finding.message)).toEqual(expect.arrayContaining(['native package-manager version conflict', 'catalog specifier conflict']))
  })

  it('accepts declared safe values and mode-specific development Mock', async () => {
    const fixtureRoot = await createDoctorFixture({ '.env.development.local': 'VITE_ENABLE_MOCKS=true', '.env.production.local': 'VITE_ENABLE_MOCKS=false' })
    expect(inspectDoctorFiles(fixtureRoot).every(finding => finding.level === 'pass')).toBe(true)
  })

  it('blocks secrets and undeclared variables in every mode without exposing their contents', async () => {
    for (const fileName of ['.env', '.env.local', '.env.development', '.env.development.local', '.env.test', '.env.test.local', '.env.production', '.env.production.local']) {
      const fixtureRoot = await createDoctorFixture({ [fileName]: 'VITE_SECRET_KEY=private-fixture-secret\nUNDECLARED=hidden-fixture-value' })
      const findings = inspectDoctorFiles(fixtureRoot)
      expect(findings).toEqual(expect.arrayContaining([expect.objectContaining({ label: `${fileName} VITE_SECRET_KEY`, message: 'dangerous browser-visible secret naming', level: 'fail' })]))
      expect(JSON.stringify(findings)).not.toMatch(/private-fixture-secret|hidden-fixture-value/)
    }
  })

  it('blocks invalid booleans, credentialed URLs, insecure sockets and origin paths', async () => {
    const fixtureRoot = await createDoctorFixture({ '.env.test': 'VITE_ENABLE_MOCKS=yes\nVITE_API_BASE_URL=https://user:secret@example.com\nVITE_NOTIFICATION_WS_URL=ws://example.com\nVITE_NAVIGATION_ALLOWED_ORIGINS=https://example.com/path' })
    expect(inspectDoctorFiles(fixtureRoot).map(finding => finding.message)).toEqual(expect.arrayContaining(['invalid boolean', 'invalid API URL', 'invalid secure WebSocket URL', 'invalid secure origin allow-list']))
  })

  it('blocks effective production Mock including shared-file inheritance', async () => {
    const fixtureRoot = await createDoctorFixture({ '.env.local': 'VITE_ENABLE_MOCKS=true' })
    expect(inspectDoctorFiles(fixtureRoot)).toContainEqual({ label: '.env.local VITE_ENABLE_MOCKS', message: 'production Mock enabled', level: 'fail' })
    await writeFile(resolve(fixtureRoot, '.env.production'), 'VITE_ENABLE_MOCKS=false')
    expect(inspectDoctorFiles(fixtureRoot).every(finding => finding.level === 'pass')).toBe(true)
  })

  it('blocks missing baselines and stale dependency/catalog/override entries', async () => {
    const fixtureRoot = await createDoctorFixture({ 'pnpm-workspace.yaml': 'autoInstallPeers: true\ncatalog:\n  vue: 3.5.43\noverrides:\n  vue: 3.5.43', 'package.json': JSON.stringify({ packageManager: 'pnpm@12.4.1', engines: { node: '>=24.18.0 <25' }, dependencies: { vue: '^3.5.42' } }) })
    expect(inspectDoctorFiles(fixtureRoot).map(finding => finding.message)).toEqual(expect.arrayContaining(['dependency specifier conflict', 'override conflict', 'peer installation settings conflict']))
    await rm(resolve(fixtureRoot, 'pnpm-lock.yaml'))
    expect(inspectDoctorFiles(fixtureRoot)).toContainEqual({ label: 'pnpm-lock.yaml', message: 'missing required baseline file', level: 'fail' })
  })
})

describe('cI event contracts', () => {
  it('keeps PR gates parallel and limits expensive checks to trusted events', async () => {
    const workflow = readYaml(await readFile(resolve(import.meta.dirname, '../../.github/workflows/ci.yml'), 'utf8')) as {
      on: { schedule: { cron: string }[] }
      jobs: Record<string, { if?: string, needs?: string | string[], steps: { uses?: string, with?: Record<string, unknown> }[] }>
    }
    expect(workflow.on.schedule).toEqual([{ cron: '0 2 * * 1' }])
    expect(workflow.jobs['chromium-smoke']?.needs).toBeUndefined()
    expect(workflow.jobs['chromium-smoke']?.if).toBe('github.event_name == \'pull_request\'')
    for (const jobName of ['windows-clean-check', 'e2e', 'container'])
      expect(workflow.jobs[jobName]?.if).toBe('github.event_name != \'pull_request\'')
    for (const job of Object.values(workflow.jobs)) {
      for (const step of job.steps) {
        if (step.uses)
          expect(step.uses).toMatch(/@[a-f0-9]{40}$/)
        if (step.uses?.startsWith('pnpm/setup@')) {
          expect(step.with).toEqual({ cache: true, install: false, runtime: 'node@24.18.0' })
          expect(step.with).not.toHaveProperty('version')
        }
      }
    }
  })
})

describe('chart source boundary fixtures', () => {
  it('accepts approved adapters isolated behind the project entry', async () => {
    const fixtureRoot = await createChartFixture({
      'components/ui/chart/index.ts': [
        'export { default as ChartBar } from \'@unovis/vue/components/stacked-bar\'',
        'export { default as ChartDonut } from \'@unovis/vue/components/donut\'',
        'export { default as ChartLine } from \'@unovis/vue/components/line\'',
      ].join('\n'),
      'features/dashboard/chart.ts': 'import { ChartLine } from \'@/components/ui/chart\'',
    })
    const sourceRoot = resolve(fixtureRoot, 'src')

    await expect(inspectChartBoundary({
      chartEntryPath: resolve(sourceRoot, 'components/ui/chart/index.ts'),
      projectRoot: fixtureRoot,
      sourceRoot,
    })).resolves.toEqual([])
  })

  it('reports missing adapters, direct provider imports, and map renderers', async () => {
    const fixtureRoot = await createChartFixture({
      'components/ui/chart/index.ts': 'export { default as ChartLine } from \'@unovis/vue/components/line\'',
      'features/dashboard/chart.ts': [
        'import { VisLine } from \'@unovis/vue\'',
        'import maplibregl from \'maplibre-gl\'',
      ].join('\n'),
    })
    const sourceRoot = resolve(fixtureRoot, 'src')
    const violations = await inspectChartBoundary({
      chartEntryPath: resolve(sourceRoot, 'components/ui/chart/index.ts'),
      projectRoot: fixtureRoot,
      sourceRoot,
    })

    expect(violations).toEqual(expect.arrayContaining([
      'Chart entry is missing the stable ChartBar adapter.',
      'Chart entry is missing the stable ChartDonut adapter.',
      'src/features/dashboard/chart.ts: import Unovis through @/components/ui/chart.',
      'src/features/dashboard/chart.ts: map renderers are outside the core chart boundary.',
    ]))
  })
})
