import { readdir, readFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import process from 'node:process'
import ts from 'typescript'

const projectRoot = resolve(import.meta.dirname, '..')
const sourceRoot = resolve(projectRoot, 'src')
const contractOptionIndexByFunction = new Map([
  ['del', 1],
  ['get', 2],
  ['post', 2],
  ['put', 2],
  ['upload', 2],
  ['uploadFileBytes', 2],
])

async function getFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nestedFiles = await Promise.all(
    entries.map((entry) => {
      const entryPath = resolve(directory, entry.name)
      return entry.isDirectory() ? getFiles(entryPath) : [entryPath]
    }),
  )
  return nestedFiles.flat()
}

function getExecutableSource(filePath, source) {
  if (!filePath.endsWith('.vue')) return source
  return [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .join('\n')
}

function hasResponseSchema(optionsArgument) {
  if (!optionsArgument || !ts.isObjectLiteralExpression(optionsArgument)) return false
  return optionsArgument.properties.some((property) => {
    if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property))
      return false
    return property.name?.getText().replaceAll(/['"]/g, '') === 'responseSchema'
  })
}

function getLineLocation(sourceFile, node) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
  return `${line + 1}:${character + 1}`
}

const sourceFiles = (await getFiles(sourceRoot)).filter(
  (filePath) =>
    (filePath.endsWith('.ts') || filePath.endsWith('.vue')) &&
    !filePath.endsWith('.d.ts') &&
    !filePath.includes('/__tests__/') &&
    !filePath.includes('/mocks/'),
)
const violations = []
let validatedCallCount = 0

for (const filePath of sourceFiles) {
  const fileSource = getExecutableSource(filePath, await readFile(filePath, 'utf8'))
  const sourceFile = ts.createSourceFile(
    filePath,
    fileSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const importedFunctions = new Map()

  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      statement.moduleSpecifier.text !== '@/lib/http'
    ) {
      continue
    }
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) continue

    for (const binding of bindings.elements) {
      const importedName = binding.propertyName?.text ?? binding.name.text
      if (importedName === 'http') {
        violations.push(
          `${relative(projectRoot, filePath)}:${getLineLocation(sourceFile, binding)} imports the raw HTTP client.`,
        )
      }
      if (contractOptionIndexByFunction.has(importedName)) {
        importedFunctions.set(binding.name.text, importedName)
      }
    }
  }

  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const importedName = importedFunctions.get(node.expression.text)
      if (importedName) {
        const optionsIndex = contractOptionIndexByFunction.get(importedName)
        if (optionsIndex === undefined) return
        validatedCallCount += 1
        if (!hasResponseSchema(node.arguments[optionsIndex])) {
          violations.push(
            `${relative(projectRoot, filePath)}:${getLineLocation(sourceFile, node)} ${importedName}() has no explicit responseSchema.`,
          )
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
}

if (violations.length > 0) {
  throw new Error(`Runtime API response contract violations:\n${violations.sort().join('\n')}`)
}

// AI modified: every JSON success path must reject malformed domain payloads before state consumption.
process.stdout.write(
  `Runtime API contract validates ${validatedCallCount} production request call(s) and forbids raw client bypasses.\n`,
)
