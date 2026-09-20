import { readFileSync } from 'node:fs'
import process from 'node:process'
import YAML from 'yaml'

interface OpenApiPathItem {
  $ref?: string
  get?: unknown
  post?: unknown
  put?: unknown
  patch?: unknown
  delete?: unknown
}

interface OpenApiDocument {
  paths: Record<string, OpenApiPathItem>
  components: {
    pathItems: Record<string, OpenApiPathItem>
  }
}

interface BacklogGroup {
  owner: string
  issue: string
  targetPhase: string
  operations: string[]
}

interface ApiBindingPlan {
  schemaVersion: 1
  boundOperations: string[]
  backlogGroups: BacklogGroup[]
}

const methods = ['get', 'post', 'put', 'patch', 'delete'] as const
const openApi = YAML.parse(readFileSync('docs/openapi.yaml', 'utf8')) as OpenApiDocument
const plan = JSON.parse(
  readFileSync('docs/product/api-binding-plan.json', 'utf8'),
) as ApiBindingPlan

if (plan.schemaVersion !== 1)
  throw new Error('Unsupported API binding plan schema version.')

const contractOperations = new Set<string>()
for (const [path, declaredPathItem] of Object.entries(openApi.paths)) {
  const referenceName = declaredPathItem.$ref?.split('/').at(-1)
  const pathItem = referenceName
    ? openApi.components.pathItems[referenceName]
    : declaredPathItem
  if (!pathItem)
    throw new Error(`${path}: unresolved OpenAPI path item ${declaredPathItem.$ref}`)
  for (const method of methods) {
    if (pathItem[method])
      contractOperations.add(`${method.toUpperCase()} ${path}`)
  }
}

const plannedOperations = new Set<string>()
const duplicateOperations: string[] = []
for (const operation of plan.boundOperations) {
  if (plannedOperations.has(operation))
    duplicateOperations.push(operation)
  plannedOperations.add(operation)
}
for (const group of plan.backlogGroups) {
  if (!group.owner || !group.issue || !group.targetPhase)
    throw new Error('Every API backlog group requires an owner, Issue, and target phase.')
  for (const operation of group.operations) {
    if (plannedOperations.has(operation))
      duplicateOperations.push(operation)
    plannedOperations.add(operation)
  }
}

const missingOperations = [...contractOperations].filter(operation => !plannedOperations.has(operation))
const staleOperations = [...plannedOperations].filter(operation => !contractOperations.has(operation))
if (duplicateOperations.length || missingOperations.length || staleOperations.length) {
  throw new Error([
    'API binding plan drifted from OpenAPI.',
    duplicateOperations.length ? `Duplicate: ${duplicateOperations.join(', ')}` : '',
    missingOperations.length ? `Missing: ${missingOperations.join(', ')}` : '',
    staleOperations.length ? `Stale: ${staleOperations.join(', ')}` : '',
  ].filter(Boolean).join('\n'))
}

// AI modified: every generated operation is explicitly bound now or assigned to an owned follow-up.
process.stdout.write(
  `API binding plan passed: ${plan.boundOperations.length} bound, ${plannedOperations.size - plan.boundOperations.length} owned backlog operation(s).\n`,
)
