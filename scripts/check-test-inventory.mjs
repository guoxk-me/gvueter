import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'

const projectRoot = resolve(import.meta.dirname, '..')

async function getFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const entryPath = resolve(directory, entry.name)
      return entry.isDirectory() ? getFiles(entryPath) : [entryPath]
    }),
  )
  return files.flat()
}

const unitSpecs = (await getFiles(resolve(projectRoot, 'src/__tests__'))).filter(file =>
  file.endsWith('.spec.ts'),
)
const browserSpecs = (await getFiles(resolve(projectRoot, 'e2e'))).filter(file =>
  file.endsWith('.spec.ts'),
)
const specSource = (
  await Promise.all([...unitSpecs, ...browserSpecs].map(file => readFile(file, 'utf8')))
).join('\n')
const featureEntries = await readdir(resolve(projectRoot, 'src/features'), {
  withFileTypes: true,
})
const features = featureEntries.filter(entry => entry.isDirectory()).map(entry => entry.name)
const unreferencedFeatures = features.filter(
  feature => !specSource.includes(`@/features/${feature}`),
)
const declaredTests = [
  ...specSource.matchAll(/\b(?:it|test)(?:\.(?:concurrent|each|fails|skip|todo))*\s*\(/g),
].map(match => match[0])
const disabledTestCount = [...specSource.matchAll(/\b(?:describe|it|test)\.(?:skip|todo)\s*\(/g)]
  .length
// AI modified: skipped and todo declarations are not evidence of executed behavior.
const testCount = declaredTests.filter(declaration => !/\.(?:skip|todo)/.test(declaration)).length
const minimums = { browserSpecs: 5, testCases: 450, unitSpecs: 60 }
const violations = []

if (unitSpecs.length < minimums.unitSpecs) {
  violations.push(`unit specs ${unitSpecs.length} < ${minimums.unitSpecs}`)
}
if (browserSpecs.length < minimums.browserSpecs) {
  violations.push(`browser specs ${browserSpecs.length} < ${minimums.browserSpecs}`)
}
if (testCount < minimums.testCases) {
  violations.push(`test cases ${testCount} < ${minimums.testCases}`)
}
if (unreferencedFeatures.length > 0) {
  violations.push(`features without direct test references: ${unreferencedFeatures.join(', ')}`)
}
if (disabledTestCount > 0) {
  violations.push(`disabled test suites or cases: ${disabledTestCount}`)
}

if (violations.length > 0) {
  throw new Error(`Test inventory gate failed:\n${violations.join('\n')}`)
}

process.stdout.write(
  `Test inventory passed: ${unitSpecs.length} unit specs, ${browserSpecs.length} browser specs, ${testCount} enabled test cases, ${features.length} referenced features, 0 disabled declarations.\n`,
)
