import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vite-plus/test'
import { PERFORMANCE_BUDGET } from '@/lib/performance-contract'

describe('performance contract', () => {
  it('defines bounded thresholds for data, cache, build, and interaction work', () => {
    expect(PERFORMANCE_BUDGET).toMatchObject({
      virtualTableRowThreshold: 200,
      lazyTreeNodeThreshold: 100,
      keepAliveMax: 20,
      firstScreenMilliseconds: 2500,
      routeTransitionMilliseconds: 250,
      layoutTransitionMilliseconds: 320,
      interactionMilliseconds: 100,
    })
    expect(PERFORMANCE_BUDGET.entryGzipBytes).toBeLessThanOrEqual(85 * 1024)
    expect(PERFORMANCE_BUDGET.asyncChunkGzipBytes).toBeLessThanOrEqual(110 * 1024)
  })

  it('uses the shared cache limit and manifest-backed build gate', async () => {
    const routeOutletSource = await readFile(
      resolve(process.cwd(), 'src/components/layout/AdminRouteOutlet.vue'),
      'utf8',
    )
    const viteSource = await readFile(resolve(process.cwd(), 'vite.config.ts'), 'utf8')
    const packageSource = await readFile(resolve(process.cwd(), 'package.json'), 'utf8')

    expect(routeOutletSource).toContain('PERFORMANCE_BUDGET.keepAliveMax')
    expect(viteSource).toContain('manifest: true')
    expect(packageSource).toContain('check:bundle')
  })
})
