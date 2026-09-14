// @env node
import { readdir, readFile } from 'node:fs/promises'
import { extname, relative, resolve } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

export interface ChartBoundaryOptions {
  chartEntryPath: string
  projectRoot: string
  sourceRoot: string
}

const sourceExtensions = new Set(['.js', '.mjs', '.ts', '.vue'])
const providerImportPattern
  = /(?:from\s+|import\s*\(\s*)['"]@unovis\/(?:ts|vue)(?:\/[^'"]*)?['"]/
const forbiddenMapPattern
  = /(?:from\s+|import\s*\(\s*)['"](?:maplibre-gl|leaflet)(?:\/[^'"]*)?['"]|Vis(?:Leaflet|TopoJSON)Map/

async function collectSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(directory, entry.name)
      if (entry.isDirectory())
        return collectSourceFiles(entryPath)
      return sourceExtensions.has(extname(entry.name)) ? [entryPath] : []
    }),
  )
  return nestedFiles.flat()
}

export async function inspectChartBoundary(options: ChartBoundaryOptions): Promise<string[]> {
  const violations: string[] = []
  const chartEntrySource = await readFile(options.chartEntryPath, 'utf8')

  for (const adapterName of ['ChartBar', 'ChartDonut', 'ChartLine']) {
    if (!chartEntrySource.includes(adapterName))
      violations.push(`Chart entry is missing the stable ${adapterName} adapter.`)
  }

  for (const sourcePath of await collectSourceFiles(options.sourceRoot)) {
    const source = await readFile(sourcePath, 'utf8')
    const sourceName = relative(options.projectRoot, sourcePath)

    if (sourcePath !== options.chartEntryPath && providerImportPattern.test(source))
      violations.push(`${sourceName}: import Unovis through @/components/ui/chart.`)

    if (forbiddenMapPattern.test(source))
      violations.push(`${sourceName}: map renderers are outside the core chart boundary.`)
  }

  return violations
}

async function runChartBoundaryCheck(): Promise<void> {
  const projectRoot = resolve(import.meta.dirname, '..')
  const sourceRoot = resolve(projectRoot, 'src')
  const violations = await inspectChartBoundary({
    chartEntryPath: resolve(sourceRoot, 'components/ui/chart/index.ts'),
    projectRoot,
    sourceRoot,
  })

  if (violations.length > 0)
    throw new Error(`Chart source boundary failed:\n${violations.join('\n')}`)

  // AI modified: the typed source gate keeps the replaceable provider and excluded map surface explicit.
  process.stdout.write('Chart source boundary passed for Line, Bar, and Donut adapters.\n')
}

const executedPath = process.argv[1]
if (executedPath && import.meta.url === pathToFileURL(executedPath).href)
  await runChartBoundaryCheck()
