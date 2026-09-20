import { readdirSync, readFileSync, statSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import process from 'node:process'

const projectRoot = resolve(import.meta.dirname, '..')
const sourceRoot = resolve(projectRoot, 'src')
const sourceExtensions = /\.(?:ts|tsx|vue)$/
const featureImportPattern = /['"]@\/features\/([^/'"]+)(\/[^'"]+)?['"]/g
const forbiddenFeatureLayerPattern = /['"]@\/(layouts|router|pages)(?:\/[^'"]+)?['"]/g
const publicEntryOnlyRoots = new Set(['components', 'config', 'lib', 'stores', 'types'])
const navigationRegistry = 'features/navigation/navigation-contract.ts'

function getSourceFiles(directory: string): string[] {
  const sourceFiles: string[] = []
  for (const entryName of readdirSync(directory)) {
    const entryPath = resolve(directory, entryName)
    if (statSync(entryPath).isDirectory()) {
      sourceFiles.push(...getSourceFiles(entryPath))
      continue
    }
    if (sourceExtensions.test(entryName))
      sourceFiles.push(entryPath)
  }
  return sourceFiles
}

function getSourcePath(filePath: string): string {
  return relative(sourceRoot, filePath).split(sep).join('/')
}

const violations: string[] = []

for (const filePath of getSourceFiles(sourceRoot)) {
  const sourcePath = getSourcePath(filePath)
  const pathSegments = sourcePath.split('/')
  const sourceFeature = pathSegments[0] === 'features' ? pathSegments[1] : undefined
  const sourceRootName = pathSegments[0]
  const source = readFileSync(filePath, 'utf8')

  for (const match of source.matchAll(featureImportPattern)) {
    const targetFeature = match[1]
    const deepPath = match[2]
    if (!deepPath)
      continue

    if (sourceFeature && targetFeature !== sourceFeature) {
      violations.push(
        `${sourcePath}: cross-feature import must use @/features/${targetFeature}`,
      )
      continue
    }

    if (!sourceFeature && sourceRootName && publicEntryOnlyRoots.has(sourceRootName)) {
      violations.push(
        `${sourcePath}: shared/application layers must use @/features/${targetFeature}`,
      )
    }
  }

  if (sourceFeature) {
    for (const match of source.matchAll(forbiddenFeatureLayerPattern)) {
      const targetLayer = match[1]
      // AI modified: the navigation registry is the sole composition seam that maps safe keys to pages.
      if (targetLayer === 'pages' && sourcePath === navigationRegistry)
        continue
      violations.push(`${sourcePath}: feature modules cannot import the ${targetLayer} layer`)
    }
  }
}

if (violations.length > 0) {
  throw new Error(`Feature boundary check failed:\n${violations.join('\n')}`)
}

process.stdout.write('Feature boundaries passed: public entries and layer directions are intact.\n')
