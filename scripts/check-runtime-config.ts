// @env node
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import {
  RUNTIME_CONFIG_MAX_BYTES,
  validateRuntimeConfig,
} from '../src/config/runtime-config-schema.ts'

const projectRoot = resolve(import.meta.dirname, '..')
const requestedFiles = process.argv.slice(2)
const configFiles = requestedFiles.length > 0
  ? requestedFiles
  : ['public/runtime-config.json']

for (const configFile of configFiles) {
  const absolutePath = resolve(projectRoot, configFile)
  const source = await readFile(absolutePath)
  if (source.byteLength > RUNTIME_CONFIG_MAX_BYTES)
    throw new Error(`${configFile} exceeds the 32 KiB public configuration limit.`)

  let candidate: unknown
  try {
    candidate = JSON.parse(source.toString('utf8')) as unknown
  }
  catch {
    throw new Error(`${configFile} is not valid JSON.`)
  }
  validateRuntimeConfig(candidate)
}

// AI modified: static and container deployments share the browser's closed-schema contract.
process.stdout.write(`Runtime Config gate passed for ${configFiles.join(', ')}.\n`)
