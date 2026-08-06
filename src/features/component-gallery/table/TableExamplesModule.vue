<script setup lang="ts">
import type { TableExampleGroup } from './table-examples'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PageHeader } from '@/components/admin'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ComponentCenterModuleNav from '../components/ComponentCenterModuleNav.vue'
import ComponentModuleCatalog from '../components/ComponentModuleCatalog.vue'
import BasicTableDemo from './examples/BasicTableDemo.vue'
import ClientPaginationDemo from './examples/ClientPaginationDemo.vue'
import ComplexColumnsTableDemo from './examples/ComplexColumnsTableDemo.vue'
import EditableTableDemo from './examples/EditableTableDemo.vue'
import ResponsiveTableDemo from './examples/ResponsiveTableDemo.vue'
import SelectionBulkTableDemo from './examples/SelectionBulkTableDemo.vue'
import ServerPaginationDemo from './examples/ServerPaginationDemo.vue'
import TableStatesDemo from './examples/TableStatesDemo.vue'
import TreeTableDemo from './examples/TreeTableDemo.vue'
import VirtualTableDemo from './examples/VirtualTableDemo.vue'
import { DEFAULT_TABLE_TREE_EXPANDED_NODE_IDS, getTableExamplesCopy } from './table-examples'

const { locale } = useI18n()
const copy = computed(() => getTableExamplesCopy(locale.value))
const activeGroup = defineModel<TableExampleGroup>('activeGroup', { default: 'foundations' })
const expandedTreeNodeIds = defineModel<readonly string[]>('expandedTreeNodeIds', {
  default: () => [...DEFAULT_TABLE_TREE_EXPANDED_NODE_IDS],
})
</script>

<template>
  <section class="min-w-0 space-y-6" data-testid="table-examples-module">
    <PageHeader :eyebrow="copy.eyebrow" :title="copy.title" :description="copy.description">
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {{ copy.implemented }}
          </Badge>
          <Badge variant="outline">
            {{ copy.tested }}
          </Badge>
        </div>
      </template>
    </PageHeader>

    <!-- AI modified: the independent Table route stays connected to every other component module. -->
    <ComponentCenterModuleNav />

    <!-- AI modified: independent routes can deep-link to the Table module while its scenarios stay grouped by user intent. -->
    <Tabs v-model="activeGroup" class="min-w-0">
      <TabsList class="h-auto w-full justify-start overflow-x-auto sm:w-fit">
        <TabsTrigger value="foundations">
          {{ copy.tabs.foundations }}
        </TabsTrigger>
        <TabsTrigger value="interaction">
          {{ copy.tabs.interaction }}
        </TabsTrigger>
        <TabsTrigger value="scale">
          {{ copy.tabs.scale }}
        </TabsTrigger>
        <TabsTrigger value="resilience">
          {{ copy.tabs.resilience }}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="foundations" class="mt-4 space-y-4">
        <BasicTableDemo :copy="copy" />
        <ClientPaginationDemo :copy="copy" />
        <ServerPaginationDemo :copy="copy" />
      </TabsContent>
      <TabsContent value="interaction" class="mt-4 space-y-4">
        <TreeTableDemo v-model:expanded-node-ids="expandedTreeNodeIds" :copy="copy" />
        <EditableTableDemo :copy="copy" />
        <SelectionBulkTableDemo :copy="copy" />
      </TabsContent>
      <TabsContent value="scale" class="mt-4 space-y-4">
        <VirtualTableDemo :copy="copy" />
        <ComplexColumnsTableDemo :copy="copy" />
        <ResponsiveTableDemo :copy="copy" />
      </TabsContent>
      <TabsContent value="resilience" class="mt-4 space-y-4">
        <TableStatesDemo :copy="copy" />
      </TabsContent>
    </Tabs>

    <ComponentModuleCatalog :modules="['tables']" />
  </section>
</template>
