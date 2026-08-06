import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import process from 'node:process'

const projectRoot = resolve(import.meta.dirname, '..')
const repositoryFiles = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { cwd: projectRoot, encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean)

const secretPatterns = [
  ['private key', /-----BEGIN (?:DSA |EC |OPENSSH |RSA )?PRIVATE KEY-----/],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['GitHub token', /\bgh[pousr]_\w{36,255}\b/],
  ['OpenAI API key', /\bsk-[\w-]{20,}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
]
const violations = []

for (const repositoryFile of repositoryFiles) {
  const fileName = basename(repositoryFile)
  if (
    (fileName.startsWith('.env') && fileName !== '.env.example') ||
    /\.(?:key|p12|pem|pfx)$/i.test(fileName)
  ) {
    violations.push(`${repositoryFile}: sensitive file type must not be committed`)
    continue
  }

  const content = await readFile(resolve(projectRoot, repositoryFile)).catch((error) => {
    if (error?.code === 'ENOENT') return null
    throw error
  })
  if (!content) continue
  if (content.includes(0)) continue

  const source = content.toString('utf8')
  for (const [label, pattern] of secretPatterns) {
    if (pattern.test(source)) violations.push(`${repositoryFile}: possible ${label}`)
  }
}

if (violations.length > 0) {
  throw new Error(`Sensitive-file gate failed:\n${violations.join('\n')}`)
}

// AI modified: use an offline deterministic gate so CI never sends repository content to a scanner.
process.stdout.write(`Sensitive-file gate passed for ${repositoryFiles.length} repository files.\n`)
