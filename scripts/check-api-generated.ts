import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import openapiTS, { astToString, COMMENT_HEADER } from 'openapi-typescript'
import ts from 'typescript'

// AI modified: a named recursive alias avoids TypeScript 6's self-referential generated property error.
const schema = readFileSync('docs/openapi.yaml')
const generatedTypes = COMMENT_HEADER + astToString(await openapiTS(schema, {
  inject: 'type OpenApiJsonValue = null | boolean | number | string | OpenApiJsonValue[] | { [key: string]: OpenApiJsonValue };',
  transform(_schemaObject, metadata) {
    if (metadata.path === '#/components/schemas/JsonValue')
      return ts.factory.createTypeReferenceNode('OpenApiJsonValue')
  },
}))

if (process.argv.includes('--write')) {
  writeFileSync('src/types/openapi-generated.ts', generatedTypes)
  console.info('OpenAPI generated types updated from docs/openapi.yaml.')
  process.exit(0)
}

// AI modified: the check path compares in memory so CI detects drift without rewriting the committed DTO.
const committedTypes = readFileSync('src/types/openapi-generated.ts', 'utf8')

if (committedTypes !== generatedTypes) {
  console.error('OpenAPI generated types have drifted. Run corepack pnpm run api:generate.')
  process.exitCode = 1
}
else {
  console.info('OpenAPI generated types match docs/openapi.yaml.')
}
