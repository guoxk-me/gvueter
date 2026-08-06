import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vite-plus/test'

const directiveCandidates = [
  'v-permission',
  'v-copy',
  'v-debounce-click',
  'v-long-press',
  'v-autofocus',
  'v-click-outside',
  'v-throttle',
] as const

async function readApplicationSources(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const sources: string[] = []
  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      sources.push(...(await readApplicationSources(entryPath)))
    } else if (/\.(?:ts|vue)$/.test(entry.name)) {
      sources.push(await readFile(entryPath, 'utf8'))
    }
  }
  return sources
}

describe('DOM capability decisions', () => {
  it('documents every evaluated directive and its existing owner', async () => {
    const decisionDocument = await readFile(
      resolve(process.cwd(), 'docs/dom-capability-decisions.md'),
      'utf8',
    )

    for (const directive of directiveCandidates) {
      expect(decisionDocument).toContain(`\`${directive}\``)
      expect(decisionDocument).toContain('不适用')
    }
    expect(decisionDocument).toContain('PermissionGate')
    expect(decisionDocument).toContain('CopyButton')
    expect(decisionDocument).toContain('挂载更新卸载清理')
  })

  it('does not register a second directive track without a qualified DOM use case', async () => {
    const applicationSource = (await readApplicationSources(resolve(process.cwd(), 'src'))).join(
      '\n',
    )

    expect(applicationSource).not.toMatch(/\.directive\s*\(/)
    for (const directive of directiveCandidates)
      expect(applicationSource).not.toContain(`${directive}=`)
  })
})
