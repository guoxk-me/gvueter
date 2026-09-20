import { readdirSync, readFileSync, statSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import process from 'node:process'

const projectRoot = resolve(import.meta.dirname, '..')
const sourceRoot = resolve(projectRoot, 'src')
const sourceExtensions = /\.(?:ts|tsx|vue)$/
const moduleSpecifierPattern = /(?:from\s*|import\s*\()['"]([^'"]+)['"]/g

function getSourceFiles(directory: string): string[] {
  const files: string[] = []
  for (const entryName of readdirSync(directory)) {
    const entryPath = resolve(directory, entryName)
    if (statSync(entryPath).isDirectory()) {
      files.push(...getSourceFiles(entryPath))
      continue
    }
    if (sourceExtensions.test(entryName))
      files.push(entryPath)
  }
  return files
}

const violations: string[] = []
for (const filePath of getSourceFiles(sourceRoot)) {
  const sourcePath = relative(sourceRoot, filePath).split(sep).join('/')
  const isTestSource = sourcePath.startsWith('__tests__/') || /\.(?:spec|test)\.tsx?$/.test(sourcePath)
  const isMockSource = sourcePath.startsWith('mocks/')
  const source = readFileSync(filePath, 'utf8')

  for (const match of source.matchAll(moduleSpecifierPattern)) {
    const moduleSpecifier = match[1]
    if (!moduleSpecifier)
      continue
    if (!isTestSource && (moduleSpecifier === 'vitest' || moduleSpecifier === '@vue/test-utils'))
      violations.push(`${sourcePath}: test runtime import ${moduleSpecifier}`)
    if (!isTestSource && !isMockSource && (moduleSpecifier === 'msw' || moduleSpecifier.startsWith('msw/')))
      violations.push(`${sourcePath}: MSW may only be imported by the Mock boundary`)
    if (moduleSpecifier.startsWith('@/mocks/') && !isTestSource && !isMockSource) {
      const isBrowserBoundary = sourcePath === 'main.ts' && moduleSpecifier === '@/mocks/browser'
      if (!isBrowserBoundary)
        violations.push(`${sourcePath}: production source bypasses the browser Mock boundary`)
    }
    if (moduleSpecifier === 'vite-plugin-vue-devtools')
      violations.push(`${sourcePath}: Vite DevTools cannot be imported by application source`)
  }
}

if (violations.length > 0)
  throw new Error(`Production source boundary failed:\n${violations.join('\n')}`)

// AI modified: build aliases stay effective only when application source cannot bypass them.
process.stdout.write('Production source boundary passed: Mock, test, and DevTools imports are isolated.\n')
