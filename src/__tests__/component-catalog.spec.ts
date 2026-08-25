import type { ComponentCatalogEntry } from '@/features/component-gallery/component-catalog'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  adminComponentCatalog,
  componentCatalog,
  tableComponentCatalog,
  uiPrimitiveCatalog,
} from '@/features/component-gallery/component-catalog'

describe('component catalog inventory', () => {
  it('covers every current admin component, table family, and UI primitive directory', () => {
    // AI modified: filesystem parity prevents the catalog from silently drifting as components are added or removed.
    const adminSourcePaths = readdirSync(resolve('src/components/admin'), { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.vue'))
      .map(entry => `src/components/admin/${entry.name}`)
    const primitiveSourcePaths = readdirSync(resolve('src/components/ui'), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => `src/components/ui/${entry.name}`)

    expect(adminComponentCatalog.map(entry => entry.sourcePath).sort()).toEqual(
      adminSourcePaths.sort(),
    )
    expect(uiPrimitiveCatalog.map(entry => entry.sourcePath).sort()).toEqual(
      primitiveSourcePaths.sort(),
    )
    expect(tableComponentCatalog.map(entry => entry.sourcePath)).toEqual([
      'src/components/data-table/DataTable.vue',
      'src/components/pro-table/ProTable.vue',
    ])
    // AI modified: counts include the reusable DateTimePicker and every installed shadcn primitive.
    expect(adminComponentCatalog).toHaveLength(48)
    expect(tableComponentCatalog).toHaveLength(2)
    expect(uiPrimitiveCatalog).toHaveLength(65)
    expect(componentCatalog).toHaveLength(115)
  })

  it('uses unique stable IDs and references existing source and evidence locations', () => {
    const componentIds = componentCatalog.map(entry => entry.id)
    expect(new Set(componentIds).size).toBe(componentIds.length)

    for (const entry of componentCatalog) {
      expect(entry.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      if (entry.sourcePath)
        expect(existsSync(resolve(entry.sourcePath)), `${entry.id} source`).toBe(true)

      for (const location of [...entry.demoLocations, ...entry.tests.locations])
        expect(existsSync(resolve(location)), `${entry.id} evidence: ${location}`).toBe(true)
    }
  })

  it('keeps every documentation contract complete and evidence status honest', () => {
    const documentedComponents: readonly ComponentCatalogEntry[] = componentCatalog

    for (const entry of documentedComponents) {
      expect(entry.displayName.trim(), `${entry.id} display name`).not.toBe('')
      expect(entry.summary.trim(), `${entry.id} summary`).not.toBe('')
      expect(entry.businessScenarios.length, `${entry.id} scenarios`).toBeGreaterThan(0)
      expect(entry.states.length, `${entry.id} states`).toBeGreaterThan(0)
      expect(entry.limitations.length, `${entry.id} limitations`).toBeGreaterThan(0)
      expect(entry.accessibility.notes.length, `${entry.id} accessibility`).toBeGreaterThan(0)
      expect(entry.tests.coverage.trim(), `${entry.id} test coverage`).not.toBe('')
      expect(entry.release.version, `${entry.id} version`).toMatch(/^\d+\.\d+\.\d+$/)
      expect(entry.release.migrationNote.trim(), `${entry.id} migration`).not.toBe('')

      expect(Array.isArray(entry.contract.props)).toBe(true)
      expect(Array.isArray(entry.contract.events)).toBe(true)
      expect(Array.isArray(entry.contract.slots)).toBe(true)
      expect(Array.isArray(entry.contract.models)).toBe(true)
      expect(Array.isArray(entry.businessUsages)).toBe(true)

      expect(entry.demoLocations.length === 0, `${entry.id} demo status`).toBe(
        entry.availability.demo === 'missing',
      )
      expect(entry.tests.locations.length === 0, `${entry.id} test status`).toBe(
        entry.availability.test === 'missing',
      )
      expect(entry.sourcePath === null, `${entry.id} implementation status`).toBe(
        entry.availability.implementation === 'missing',
      )
    }
  })

  it('records known capability boundaries without promoting demos beyond the implementation', () => {
    const findCatalogComponent = (componentId: string) =>
      componentCatalog.find(component => component.id === componentId)

    expect(findCatalogComponent('markdown-editor')?.summary).toContain('typed safe preview')
    expect(findCatalogComponent('markdown-editor')?.limitations.join(' ')).toContain(
      'raw HTML stays text',
    )
    expect(findCatalogComponent('file-upload')?.limitations.join(' ')).toContain(
      'no network progress',
    )
    expect(findCatalogComponent('file-upload')?.limitations.join(' ')).toContain('partial success')
    expect(findCatalogComponent('icon-selector')?.limitations.join(' ')).toContain(
      'curated administrative subset',
    )
    expect(findCatalogComponent('data-table')?.limitations.join(' ')).toContain(
      'preflattens department records',
    )
    expect(findCatalogComponent('rich-text-editor')?.limitations.join(' ')).toContain(
      'must sanitize again',
    )
    expect(findCatalogComponent('code-editor')?.limitations.join(' ')).toContain(
      'textarea, not an IDE',
    )
    expect(findCatalogComponent('ui-sidebar')?.limitations.join(' ')).toContain(
      'authoritative architecture',
    )
    expect(findCatalogComponent('ui-sidebar')?.availability.demo).toBe('indirect')
  })
})
