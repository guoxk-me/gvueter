// @env node
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createConnection } from 'node:net'
import { resolve } from 'node:path'
import process from 'node:process'
import { parseEnv } from 'node:util'
import { chromium, firefox, webkit } from '@playwright/test'
import { parseAllDocuments, parse as readYaml } from 'yaml'

export interface DoctorFinding {
  label: string
  level: 'info' | 'pass' | 'warn' | 'fail'
  message: string
}
interface ProjectManifest {
  engines?: { node?: string }
  packageManager?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}
interface WorkspaceSettings {
  catalog?: Record<string, string>
  overrides?: Record<string, string>
  autoInstallPeers?: boolean
}
interface ProjectLockfile {
  lockfileVersion?: string
  settings?: { autoInstallPeers?: boolean }
  overrides?: Record<string, string>
  catalogs?: { default?: Record<string, { specifier: string }> }
  importers?: Record<string, Record<string, Record<string, { specifier: string }>>>
}
interface PackageManagerLockfile {
  importers?: Record<string, { packageManagerDependencies?: { pnpm?: { specifier?: string } } }>
}
const environmentFiles = ['.env', '.env.local', '.env.development', '.env.development.local', '.env.test', '.env.test.local', '.env.production', '.env.production.local']

function isSafeUrl(configuration: string, protocols: string[], isOrigin: boolean): boolean {
  try {
    const url = new URL(configuration)
    return protocols.includes(url.protocol) && !url.username && !url.password
      && (!isOrigin || (url.pathname === '/' && !url.search && !url.hash))
  }
  catch {
    return false
  }
}

// AI modified: fixture-friendly diagnostics never include environment values, parser errors, or secrets.
export function inspectDoctorFiles(projectRoot: string): DoctorFinding[] {
  const findings: DoctorFinding[] = []
  const report = (label: string, message: string): void => {
    findings.push({ label, level: 'fail', message })
  }
  for (const fileName of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', '.env.example', 'env.d.ts', '.node-version']) {
    if (!existsSync(resolve(projectRoot, fileName)))
      report(fileName, 'missing required baseline file')
  }
  if (findings.length)
    return findings
  try {
    const manifest = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8')) as ProjectManifest
    const expectedPnpm = manifest.packageManager?.replace(/^pnpm@/, '')
    const workspace = readYaml(readFileSync(resolve(projectRoot, 'pnpm-workspace.yaml'), 'utf8')) as WorkspaceSettings
    // AI modified: pnpm 12 stores its own native runtime in a separate YAML document before application dependencies.
    const lockDocuments = [...parseAllDocuments(readFileSync(resolve(projectRoot, 'pnpm-lock.yaml'), 'utf8'))]
    if (lockDocuments.some(document => document.errors.length > 0))
      throw new Error('Invalid lockfile')
    const lockfile = lockDocuments[lockDocuments.length - 1]?.toJS() as ProjectLockfile
    const managerLock = lockDocuments.length > 1 ? lockDocuments[0]?.toJS() as PackageManagerLockfile : undefined
    if (managerLock?.importers?.['.']?.packageManagerDependencies?.pnpm?.specifier !== expectedPnpm)
      report('pnpm-lock.yaml', 'native package-manager version conflict')
    if (manifest.engines?.node !== '>=24.18.0 <25' || readFileSync(resolve(projectRoot, '.node-version'), 'utf8').trim() !== '24.18.0')
      report('Node baseline', 'manifest and version-manager configuration conflict')
    if (!/^pnpm@12\.\d+\.\d+$/.test(manifest.packageManager ?? ''))
      report('packageManager', 'exact supported pnpm baseline required')
    if (String(lockfile.lockfileVersion) !== '9.0')
      report('pnpm-lock.yaml', 'unsupported lockfile schema')
    if (lockfile.settings?.autoInstallPeers !== workspace.autoInstallPeers)
      report('pnpm-lock.yaml', 'peer installation settings conflict')
    for (const section of ['dependencies', 'devDependencies'] as const) {
      const declared = manifest[section] ?? {}
      const locked = lockfile.importers?.['.']?.[section] ?? {}
      for (const dependencyName of new Set([...Object.keys(declared), ...Object.keys(locked)])) {
        const override = workspace.overrides?.[dependencyName]
        const expectedSpecifier = override === 'catalog:' ? workspace.catalog?.[dependencyName] : override ?? declared[dependencyName]
        if (!declared[dependencyName] || expectedSpecifier !== locked[dependencyName]?.specifier)
          report(`pnpm-lock.yaml ${dependencyName}`, 'dependency specifier conflict')
      }
    }
    for (const dependencyName of new Set([...Object.keys(workspace.catalog ?? {}), ...Object.keys(lockfile.catalogs?.default ?? {})])) {
      // AI modified: an override replaces the root catalog reference, so pnpm omits unused catalog entries.
      if (!workspace.overrides?.[dependencyName] && workspace.catalog?.[dependencyName] !== lockfile.catalogs?.default?.[dependencyName]?.specifier)
        report(`pnpm-lock.yaml ${dependencyName}`, 'catalog specifier conflict')
    }
    for (const dependencyName of new Set([...Object.keys(workspace.overrides ?? {}), ...Object.keys(lockfile.overrides ?? {})])) {
      const override = workspace.overrides?.[dependencyName]
      const expectedOverride = override === 'catalog:' ? workspace.catalog?.[dependencyName] : override
      if (expectedOverride !== lockfile.overrides?.[dependencyName])
        report(`pnpm-lock.yaml ${dependencyName}`, 'override conflict')
    }
  }
  catch {
    report('Toolchain configuration', 'invalid manifest, workspace, or lockfile structure')
  }
  const environmentDeclarations = readFileSync(resolve(projectRoot, 'env.d.ts'), 'utf8')
  const declaredNames = new Set([...environmentDeclarations.matchAll(/readonly\s+(VITE_\w+)\??:/g)].map(match => match[1]))
  const productionConfiguration: Record<string, { fileName: string, configuration: string }> = {}
  for (const fileName of ['.env.example', ...environmentFiles]) {
    if (!existsSync(resolve(projectRoot, fileName)))
      continue
    try {
      const variables = parseEnv(readFileSync(resolve(projectRoot, fileName), 'utf8'))
      for (const [variableName, configuration] of Object.entries(variables)) {
        if (configuration === undefined)
          continue
        const label = `${fileName} ${variableName}`
        if (!declaredNames.has(variableName))
          report(label, 'undeclared environment variable')
        if (variableName.startsWith('VITE_') && /SECRET|TOKEN|PASSWORD|PRIVATE|CREDENTIAL|(?:^|_)KEY(?:_|$)/i.test(variableName))
          report(label, 'dangerous browser-visible secret naming')
        if (variableName === 'VITE_ENABLE_MOCKS' && !['true', 'false'].includes(configuration))
          report(label, 'invalid boolean')
        if (variableName === 'VITE_API_BASE_URL' && !(configuration.startsWith('/') && !configuration.startsWith('//') && !/[\\\s?#]/.test(configuration)) && !isSafeUrl(configuration, ['http:', 'https:'], false))
          report(label, 'invalid API URL')
        if (variableName === 'VITE_NOTIFICATION_WS_URL' && configuration && !isSafeUrl(configuration, ['wss:'], false))
          report(label, 'invalid secure WebSocket URL')
        if (['VITE_NOTIFICATION_WS_ALLOWED_ORIGINS', 'VITE_NAVIGATION_ALLOWED_ORIGINS'].includes(variableName)) {
          const protocols = variableName === 'VITE_NOTIFICATION_WS_ALLOWED_ORIGINS' ? ['wss:'] : ['https:']
          if (configuration && configuration.split(',').some(origin => !isSafeUrl(origin.trim(), protocols, true)))
            report(label, 'invalid secure origin allow-list')
        }
        if (['.env', '.env.local', '.env.production', '.env.production.local'].includes(fileName))
          productionConfiguration[variableName] = { fileName, configuration }
      }
    }
    catch {
      report(fileName, 'invalid environment file')
    }
  }
  const productionMocks = productionConfiguration.VITE_ENABLE_MOCKS
  if (productionMocks?.configuration === 'true')
    report(`${productionMocks.fileName} VITE_ENABLE_MOCKS`, 'production Mock enabled')
  if (findings.length === 0)
    findings.push({ label: 'Repository configuration', level: 'pass', message: 'lockfile, runtime baseline, and public environment contracts agree' })
  return findings
}

async function isPortListening(port: number): Promise<boolean> {
  return new Promise((resolvePort) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    socket.once('connect', () => {
      socket.destroy()
      resolvePort(true)
    })
    socket.once('error', () => resolvePort(false))
    socket.setTimeout(500, () => {
      socket.destroy()
      resolvePort(false)
    })
  })
}

async function runDoctor(): Promise<void> {
  const projectRoot = resolve(import.meta.dirname, '..')
  const findings = inspectDoctorFiles(projectRoot)
  const [major = 0, minor = 0] = process.versions.node.split('.').map(Number)
  findings.push({ label: 'Node.js', level: major === 24 && minor >= 18 ? 'pass' : 'fail', message: `${process.version}; required >=24.18.0 <25` })
  try {
    // AI modified: diagnostics derive the exact pnpm pin from packageManager instead of duplicating it.
    const manifest = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8')) as ProjectManifest
    const expectedPnpm = manifest.packageManager?.replace(/^pnpm@/, '')
    // AI modified: pnpm 12 supplies a native executable on Windows, not a pnpm.cmd batch script.
    const actualPnpm = execFileSync(process.env.npm_execpath ?? 'pnpm', ['--version'], { encoding: 'utf8' }).trim()
    findings.push({ label: 'pnpm', level: actualPnpm === expectedPnpm ? 'pass' : 'fail', message: 'packageManager version check' })
  }
  catch {
    findings.push({ label: 'pnpm', level: 'fail', message: 'cannot execute the pinned native pnpm runtime' })
  }
  if (!process.argv.includes('--ci')) {
    for (const browser of [chromium, firefox, webkit]) {
      const isInstalled = existsSync(browser.executablePath())
      findings.push({ label: browser.name(), level: isInstalled ? 'pass' : 'warn', message: isInstalled ? 'optional Playwright runtime installed' : 'optional runtime missing; run pnpm exec playwright install chromium firefox webkit' })
    }
    for (const port of [5173, 4173]) {
      const isListening = await isPortListening(port)
      findings.push({ label: `Port ${port}`, level: isListening ? 'warn' : 'info', message: isListening ? 'currently in use' : 'available' })
    }
  }
  for (const finding of findings)
    process.stdout.write(`${finding.level.toUpperCase().padEnd(4)} ${finding.label}: ${finding.message}\n`)
  if (findings.some(finding => finding.level === 'fail'))
    process.exitCode = 1
  else
    process.stdout.write('Toolchain doctor completed without blocking issues.\n')
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename))
  await runDoctor()
