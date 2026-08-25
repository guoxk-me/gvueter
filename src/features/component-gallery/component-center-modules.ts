import type { Component } from 'vue'
import type { ComponentCatalogModule } from './component-catalog'
import {
  Blocks,
  FileCode2,
  FileInput,
  FormInput,
  GalleryVerticalEnd,
  ListFilter,
  TableProperties,
  UploadCloud,
} from '@lucide/vue'

export type ComponentCenterModuleId
  = | 'editors'
    | 'forms'
    | 'icons'
    | 'patterns'
    | 'primitives'
    | 'selection'
    | 'tables'
    | 'uploads'

export interface ComponentCenterModuleDefinition {
  id: ComponentCenterModuleId
  path: string
  titleKey: string
  descriptionKey: string
  icon: Component
  catalogModules: readonly ComponentCatalogModule[]
}

// AI modified: every catalog family has one stable route owner so examples no longer depend on a giant tab state.
export const componentCenterModules = [
  {
    id: 'tables',
    path: '/components/table',
    titleKey: 'components.center.modules.tables.title',
    descriptionKey: 'components.center.modules.tables.description',
    icon: TableProperties,
    catalogModules: ['tables'],
  },
  {
    id: 'forms',
    path: '/components/form',
    titleKey: 'components.center.modules.forms.title',
    descriptionKey: 'components.center.modules.forms.description',
    icon: FormInput,
    catalogModules: ['forms'],
  },
  {
    id: 'uploads',
    path: '/components/upload-drag',
    titleKey: 'components.center.modules.uploads.title',
    descriptionKey: 'components.center.modules.uploads.description',
    icon: UploadCloud,
    catalogModules: ['uploads'],
  },
  {
    id: 'selection',
    path: '/components/selection',
    titleKey: 'components.center.modules.selection.title',
    descriptionKey: 'components.center.modules.selection.description',
    icon: ListFilter,
    catalogModules: ['selection'],
  },
  {
    id: 'editors',
    path: '/components/editors',
    titleKey: 'components.center.modules.editors.title',
    descriptionKey: 'components.center.modules.editors.description',
    icon: FileCode2,
    catalogModules: ['editors'],
  },
  {
    id: 'icons',
    path: '/components/icons',
    titleKey: 'components.center.modules.icons.title',
    descriptionKey: 'components.center.modules.icons.description',
    icon: GalleryVerticalEnd,
    catalogModules: ['icons'],
  },
  {
    id: 'primitives',
    path: '/components/primitives',
    titleKey: 'components.center.modules.primitives.title',
    descriptionKey: 'components.center.modules.primitives.description',
    icon: Blocks,
    catalogModules: ['primitives'],
  },
  {
    id: 'patterns',
    path: '/components/patterns',
    titleKey: 'components.center.modules.patterns.title',
    descriptionKey: 'components.center.modules.patterns.description',
    icon: FileInput,
    catalogModules: ['data-display', 'feedback', 'shell', 'workflow'],
  },
] as const satisfies readonly ComponentCenterModuleDefinition[]
