import { readdir, readFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import process from 'node:process'
import ts from 'typescript'
import { parseDocument } from 'yaml'

const projectRoot = resolve(import.meta.dirname, '..')
const handlersRoot = resolve(projectRoot, 'src/mocks/handlers')
const httpMethods = ['delete', 'get', 'patch', 'post', 'put']
const bodylessMutationOperations = new Set([
  'post /auth/logout',
  'put /notifications/{parameter}/read',
  'post /monitoring/caches/{parameter}/clear',
  'post /monitoring/jobs/{parameter}/run',
  'post /monitoring/sessions/{parameter}/terminate',
])
const publicOperations = new Set([
  'get /auth/captcha',
  'get /auth/sso/config',
  'post /auth/forgot-password',
  'post /auth/login',
  'post /auth/reset-password',
  'post /auth/sso/exchange',
  'post /auth/sso/start',
  'get /contract-scenarios/delay',
  'get /contract-scenarios/failures/{parameter}',
  'get /contract-scenarios/timeout',
])

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

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getContractPath(apiPath) {
  // AI modified: parameter names are implementation details; compare canonical path shapes.
  return apiPath
    .replace(/^\/api/, '')
    .replace(/\$\{[^}]+\}/g, '{parameter}')
    .replace(/:[a-z]\w*/gi, '{parameter}')
    .replace(/\{[^}]+\}/g, '{parameter}')
}

function getMockOperations(handlerSource) {
  const handlerPattern
    = /\bhttp\.(delete|get|patch|post|put)(?:<[^(]{0,500}>)?\s*\(\s*['"`](\/api\/[^'"`?\s]+)['"`]/g
  return new Set(
    [...handlerSource.matchAll(handlerPattern)].map(
      match => `${match[1]} ${getContractPath(match[2])}`,
    ),
  )
}

function validateMockJsonRequestSchemas(handlerSources) {
  const violations = []
  let validatedRequestCount = 0

  for (const { filePath, source } of handlerSources) {
    const sourceFile = ts.createSourceFile(
      filePath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    )

    function visit(node) {
      if (
        ts.isCallExpression(node)
        && ts.isIdentifier(node.expression)
        && node.expression.text === 'readMockJsonBody'
      ) {
        validatedRequestCount += 1
        const schemaArgument = node.arguments[1]
        if (
          !schemaArgument
          || (ts.isIdentifier(schemaArgument) && schemaArgument.text === 'undefined')
        ) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            node.getStart(sourceFile),
          )
          violations.push(
            `${relative(projectRoot, filePath)}:${line + 1}:${character + 1} has no explicit JSON request schema.`,
          )
        }
      }
      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
  }

  if (violations.length > 0) {
    throw new Error(`Mock JSON request contract violations:\n${violations.sort().join('\n')}`)
  }
  return validatedRequestCount
}

function getReferenceTarget(openApi, reference) {
  if (!reference.startsWith('#/')) {
    throw new Error(`OpenAPI contains unsupported external reference ${reference}.`)
  }

  let target = openApi
  for (const encodedSegment of reference.slice(2).split('/')) {
    const segment = encodedSegment.replaceAll('~1', '/').replaceAll('~0', '~')
    if (!isObject(target) || !(segment in target)) {
      throw new Error(`OpenAPI reference does not resolve: ${reference}.`)
    }
    target = target[segment]
  }
  return target
}

function resolveReference(openApi, value) {
  if (!isObject(value) || typeof value.$ref !== 'string')
    return value
  const target = getReferenceTarget(openApi, value.$ref)
  if (!isObject(target))
    throw new Error(`OpenAPI reference must resolve to an object: ${value.$ref}.`)
  const siblings = Object.fromEntries(Object.entries(value).filter(([key]) => key !== '$ref'))
  return { ...target, ...siblings }
}

function validateReferenceTargets(openApi, value = openApi) {
  if (Array.isArray(value)) {
    for (const entry of value) validateReferenceTargets(openApi, entry)
    return
  }
  if (!isObject(value))
    return
  if (typeof value.$ref === 'string')
    getReferenceTarget(openApi, value.$ref)
  for (const nestedValue of Object.values(value)) validateReferenceTargets(openApi, nestedValue)
}

function getDocumentedOperations(openApi) {
  const operations = new Map()
  for (const [apiPath, unresolvedPathItem] of Object.entries(openApi.paths)) {
    const pathItem = resolveReference(openApi, unresolvedPathItem)
    if (!isObject(pathItem))
      throw new Error(`OpenAPI path item ${apiPath} must be an object.`)
    for (const method of httpMethods) {
      const operation = pathItem[method]
      if (!operation)
        continue
      if (!isObject(operation))
        throw new Error(`${method.toUpperCase()} ${apiPath} must be an object.`)
      operations.set(`${method} ${getContractPath(apiPath)}`, {
        apiPath,
        method,
        operation,
        pathItem,
      })
    }
  }
  return operations
}

function getResolvedRequestBody(openApi, operation) {
  const requestBody = resolveReference(openApi, operation.requestBody)
  if (!isObject(requestBody))
    return undefined
  return requestBody
}

function getResolvedResponse(openApi, response) {
  const resolvedResponse = resolveReference(openApi, response)
  return isObject(resolvedResponse) ? resolvedResponse : undefined
}

function validateOperationContracts(openApi, documentedOperations) {
  for (const [operationKey, { apiPath, method, operation, pathItem }] of documentedOperations) {
    const responses = operation.responses
    if (!isObject(responses) || Object.keys(responses).length === 0) {
      throw new Error(`${operationKey} must declare responses.`)
    }

    const isFailureFixture = operationKey === 'get /contract-scenarios/failures/{parameter}'
    const hasSuccessResponse = Object.keys(responses).some(status => /^2\d\d$/.test(status))
    if (!hasSuccessResponse && !isFailureFixture) {
      throw new Error(`${operationKey} must declare a 2xx response.`)
    }
    const hasFailureResponse = Object.keys(responses).some(
      status => status === 'default' || /^[45]\d\d$/.test(status),
    )
    if (!hasFailureResponse && !isFailureFixture) {
      throw new Error(`${operationKey} must declare a default or explicit failure response.`)
    }

    for (const [status, response] of Object.entries(responses)) {
      if (!getResolvedResponse(openApi, response)) {
        throw new Error(`${operationKey} response ${status} must resolve to an object.`)
      }
    }

    const isMutation = method === 'patch' || method === 'post' || method === 'put'
    const requestBody = getResolvedRequestBody(openApi, operation)
    if (isMutation && !bodylessMutationOperations.has(operationKey) && !requestBody) {
      throw new Error(`${operationKey} must declare its request body.`)
    }
    if (requestBody) {
      if (requestBody.required !== true) {
        throw new Error(`${operationKey} request body must be required.`)
      }
      if (!isObject(requestBody.content) || Object.keys(requestBody.content).length === 0) {
        throw new Error(`${operationKey} request body must declare at least one media type.`)
      }
      const jsonMediaType = requestBody.content['application/json']
      if (jsonMediaType) {
        const jsonSchema = resolveReference(openApi, jsonMediaType.schema)
        if (
          !isObject(jsonSchema)
          || jsonSchema.type !== 'object'
          || jsonSchema.additionalProperties !== false
        ) {
          throw new Error(
            `${operationKey} JSON request body must resolve to a closed domain object schema.`,
          )
        }
      }
    }

    const declaredParameters = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])]
      .map(parameter => resolveReference(openApi, parameter))
      .filter(isObject)
    for (const parameterName of [...apiPath.matchAll(/\{([^}]+)\}/g)].map(match => match[1])) {
      const hasPathParameter = declaredParameters.some(
        parameter =>
          parameter.in === 'path'
          && parameter.name === parameterName
          && parameter.required === true,
      )
      if (!hasPathParameter) {
        throw new Error(`${operationKey} is missing required path parameter ${parameterName}.`)
      }
    }

    const security = operation.security ?? pathItem.security ?? openApi.security
    const isPublic = Array.isArray(security) && security.length === 0
    if (publicOperations.has(operationKey) !== isPublic) {
      throw new Error(
        `${operationKey} security must ${publicOperations.has(operationKey) ? 'be public' : 'inherit bearer authentication'}.`,
      )
    }
  }
}

function getMediaTypes(openApi, value) {
  const resolved = resolveReference(openApi, value)
  return isObject(resolved?.content) ? Object.keys(resolved.content) : []
}

function validateBinaryContracts(openApi, documentedOperations) {
  const expectedUploadMediaTypes = new Map([
    [
      'post /users/import',
      ['application/csv', 'application/octet-stream', 'application/vnd.ms-excel', 'text/csv'],
    ],
    [
      'post /content-files',
      ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/csv', 'text/plain'],
    ],
    [
      'post /component-gallery/uploads/{parameter}/chunks/{parameter}',
      ['application/octet-stream'],
    ],
    ['post /component-gallery/form/submissions', ['multipart/form-data']],
  ])

  for (const [operationKey, expectedMediaTypes] of expectedUploadMediaTypes) {
    const operation = documentedOperations.get(operationKey)?.operation
    if (!operation)
      throw new Error(`Missing binary upload operation ${operationKey}.`)
    const requestBody = getResolvedRequestBody(openApi, operation)
    const actualMediaTypes = getMediaTypes(openApi, requestBody).sort()
    if (actualMediaTypes.join() !== [...expectedMediaTypes].sort().join()) {
      throw new Error(`${operationKey} has incorrect binary request media types.`)
    }
  }

  for (const operationKey of [
    'get /content-files/{parameter}/download',
    'get /content-files/{parameter}/preview',
    'get /component-gallery/files/{parameter}',
  ]) {
    const operation = documentedOperations.get(operationKey)?.operation
    const successResponse = operation && getResolvedResponse(openApi, operation.responses?.['200'])
    const mediaTypes = getMediaTypes(openApi, successResponse)
    if (mediaTypes.length === 0 || mediaTypes.includes('application/json')) {
      throw new Error(`${operationKey} must document a binary 200 response.`)
    }
  }

  const downloadResponse = getResolvedResponse(
    openApi,
    documentedOperations.get('get /content-files/{parameter}/download')?.operation.responses?.[
      '200'
    ],
  )
  if (!isObject(downloadResponse?.headers) || !downloadResponse.headers['Content-Disposition']) {
    throw new Error('Content-file downloads must document Content-Disposition.')
  }
}

const packageManifest = JSON.parse(await readFile(resolve(projectRoot, 'package.json'), 'utf8'))
const openApiSource = await readFile(resolve(projectRoot, 'docs/openapi.yaml'), 'utf8')
const openApiDocument = parseDocument(openApiSource, { prettyErrors: true, uniqueKeys: true })
if (openApiDocument.errors.length > 0) {
  throw new Error(
    `docs/openapi.yaml is invalid:\n${openApiDocument.errors.map(error => error.message).join('\n')}`,
  )
}
const openApi = openApiDocument.toJS()
if (!isObject(openApi) || !isObject(openApi.info) || !isObject(openApi.paths)) {
  throw new Error('docs/openapi.yaml must contain info and paths objects.')
}
if (typeof openApi.openapi !== 'string' || !openApi.openapi.startsWith('3.1.')) {
  throw new Error('docs/openapi.yaml must declare OpenAPI 3.1.')
}
if (
  !Array.isArray(openApi.servers)
  || !openApi.servers.some(server => isObject(server) && server.url === '/api')
) {
  throw new Error('docs/openapi.yaml must declare the same-origin /api server base.')
}
if (openApi.info.version !== packageManifest.version) {
  throw new Error(
    `OpenAPI version ${String(openApi.info.version ?? '(missing)')} does not match package version ${packageManifest.version}.`,
  )
}

validateReferenceTargets(openApi)
const documentedOperations = getDocumentedOperations(openApi)
validateOperationContracts(openApi, documentedOperations)
validateBinaryContracts(openApi, documentedOperations)

const handlerFiles = (await getFiles(handlersRoot)).filter(file => file.endsWith('.ts'))
const handlerSources = await Promise.all(
  handlerFiles.map(async filePath => ({
    filePath,
    source: await readFile(filePath, 'utf8'),
  })),
)
const handlerSource = handlerSources.map(({ source }) => source).join('\n')
if (/\brequest\.json\s*\(/.test(handlerSource)) {
  throw new Error('Mock handlers must use the shared typed JSON request reader.')
}
const validatedMockRequestCount = validateMockJsonRequestSchemas(handlerSources)
const mockOperations = getMockOperations(handlerSource)
const documentedOperationKeys = new Set(documentedOperations.keys())
const undocumentedOperations = [...mockOperations]
  .filter(operation => !documentedOperationKeys.has(operation))
  .sort()
const unimplementedOperations = [...documentedOperationKeys]
  .filter(operation => !mockOperations.has(operation))
  .sort()

if (undocumentedOperations.length > 0) {
  throw new Error(
    `OpenAPI is missing ${undocumentedOperations.length} Mock operation(s):\n${undocumentedOperations.join('\n')}`,
  )
}
if (unimplementedOperations.length > 0) {
  throw new Error(
    `OpenAPI documents ${unimplementedOperations.length} operation(s) without a Mock implementation:\n${unimplementedOperations.join('\n')}`,
  )
}

// AI modified: the gate now proves YAML/reference integrity plus auth, body, response, and binary contracts.
process.stdout.write(
  `OpenAPI contract validates ${mockOperations.size} Mock operations, ${validatedMockRequestCount} typed JSON request boundaries, local references, security, responses, and binary transfers at version ${openApi.info.version}.\n`,
)
