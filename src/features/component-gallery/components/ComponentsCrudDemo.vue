<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import type { DataTableFilterDefinition, DataTableFilterValues } from '@/components/data-table'
import { Eye, Plus } from '@lucide/vue'
import { createColumnHelper } from '@tanstack/vue-table'
import { computed, reactive, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { DetailDrawer, FormDialog } from '@/components/admin'
import { DataTable, DataTableFilterBar } from '@/components/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ComponentDemoCard from './ComponentDemoCard.vue'

type ProjectStatus = 'active' | 'planned' | 'paused'

interface DemoProject {
  id: string
  name: string
  owner: string
  status: ProjectStatus
  updatedAt: string
  description: string
}

const { t } = useI18n()
const columnHelper = createColumnHelper<DemoProject>()
const projects = shallowRef<DemoProject[]>([
  {
    id: 'project-001',
    name: 'Customer onboarding refresh',
    owner: 'Avery Chen',
    status: 'active',
    updatedAt: '2026-07-11',
    description: 'Redesign the first-session experience for new workspace administrators.',
  },
  {
    id: 'project-002',
    name: 'Partner reporting API',
    owner: 'Jordan Wu',
    status: 'planned',
    updatedAt: '2026-07-08',
    description: 'Expose scheduled CSV exports and role-aware reporting endpoints for partners.',
  },
  {
    id: 'project-003',
    name: 'Knowledge base migration',
    owner: 'Skyler Li',
    status: 'paused',
    updatedAt: '2026-07-04',
    description: 'Move legacy articles into the structured editor with audit-friendly ownership.',
  },
])
const filters = shallowRef<DataTableFilterValues>({ keyword: '', status: 'all' })
const isFormOpen = shallowRef(false)
const isDrawerOpen = shallowRef(false)
const selectedProject = shallowRef<DemoProject | null>(null)
const projectDraft = reactive({
  name: '',
  owner: 'Avery Chen',
  status: 'planned' as ProjectStatus,
})

const filterDefinitions = computed<readonly DataTableFilterDefinition[]>(() => [
  {
    key: 'keyword',
    type: 'search',
    placeholder: t('components.crud.searchProjects'),
  },
  {
    key: 'status',
    type: 'select',
    placeholder: t('components.crud.allStatuses'),
    defaultValue: 'all',
    options: [
      { label: t('components.crud.allStatuses'), value: 'all' },
      { label: t('components.crud.active'), value: 'active' },
      { label: t('components.crud.planned'), value: 'planned' },
      { label: t('components.crud.paused'), value: 'paused' },
    ],
  },
])
const visibleProjects = computed(() => {
  const keyword = (filters.value.keyword ?? '').trim().toLocaleLowerCase()
  const status = filters.value.status ?? 'all'
  return projects.value.filter((project) => {
    const matchesKeyword =
      !keyword ||
      [project.name, project.owner].some((value) => value.toLocaleLowerCase().includes(keyword))
    const matchesStatus = status === 'all' || project.status === status
    return matchesKeyword && matchesStatus
  })
})
const projectColumns = computed(() => [
  columnHelper.accessor('name', { header: t('components.crud.projectName') }),
  columnHelper.accessor('owner', { header: t('components.crud.projectOwner') }),
  columnHelper.accessor('status', { header: t('components.crud.projectStatus') }),
  columnHelper.accessor('updatedAt', { header: t('components.crud.updatedAt') }),
  columnHelper.display({
    id: 'actions',
    header: t('common.actions'),
    enableSorting: false,
  }),
])

function openProjectForm(): void {
  projectDraft.name = ''
  projectDraft.owner = 'Avery Chen'
  projectDraft.status = 'planned'
  isFormOpen.value = true
}

function createProject(): void {
  const name = projectDraft.name.trim()
  if (!name) {
    toast.error(t('components.crud.nameRequired'))
    return
  }

  // AI modified: replace the collection so table consumers receive a predictable immutable update.
  projects.value = [
    {
      id: `project-${String(projects.value.length + 1).padStart(3, '0')}`,
      name,
      owner: projectDraft.owner,
      status: projectDraft.status,
      updatedAt: new Date().toISOString().slice(0, 10),
      description: t('components.crud.newProjectDescription'),
    },
    ...projects.value,
  ]
  isFormOpen.value = false
  toast.success(t('components.crud.created'))
}

function openProjectDrawer(project: DemoProject): void {
  selectedProject.value = project
  isDrawerOpen.value = true
}

function updateProjectStatus(value: AcceptableValue): void {
  if (value === 'active' || value === 'planned' || value === 'paused') projectDraft.status = value
}

function statusVariant(status: ProjectStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'active') return 'default'
  if (status === 'paused') return 'outline'
  return 'secondary'
}
</script>

<template>
  <div class="space-y-4">
    <ComponentDemoCard
      :title="t('components.crud.listTitle')"
      :description="t('components.crud.listDescription')"
    >
      <DataTableFilterBar v-model="filters" :filters="filterDefinitions">
        <template #actions>
          <Button type="button" @click="openProjectForm">
            <Plus class="mr-2 size-4" aria-hidden="true" />
            {{ t('components.crud.newProject') }}
          </Button>
        </template>
      </DataTableFilterBar>
      <DataTable
        :columns="projectColumns"
        :data="visibleProjects"
        :empty-message="t('components.crud.emptyProjects')"
        :default-page-size="5"
        :get-row-id="(project) => project.id"
      >
        <template #cell="{ cell, row }">
          <Badge v-if="cell.column.id === 'status'" :variant="statusVariant(row.original.status)">
            {{ t(`components.crud.${row.original.status}`) }}
          </Badge>
          <Button
            v-else-if="cell.column.id === 'actions'"
            type="button"
            variant="ghost"
            size="sm"
            :aria-label="t('components.crud.viewProject', { name: row.original.name })"
            @click="openProjectDrawer(row.original)"
          >
            <Eye class="mr-1.5 size-4" aria-hidden="true" />
            {{ t('components.crud.view') }}
          </Button>
          <span v-else>{{ cell.getValue() }}</span>
        </template>
      </DataTable>
      <template #usage>
        &lt;DataTableFilterBar v-model="filters" :filters="definitions" /&gt;
      </template>
    </ComponentDemoCard>

    <FormDialog
      v-model:open="isFormOpen"
      :title="t('components.crud.formTitle')"
      :description="t('components.crud.formDescription')"
      :submit-label="t('components.crud.createProject')"
      :cancel-label="t('common.cancel')"
      @submit="createProject"
    >
      <div class="space-y-2">
        <Label for="component-demo-project-name">{{ t('components.crud.projectName') }}</Label>
        <Input id="component-demo-project-name" v-model="projectDraft.name" autocomplete="off" />
      </div>
      <div class="space-y-2">
        <Label for="component-demo-project-owner">{{ t('components.crud.projectOwner') }}</Label>
        <Input id="component-demo-project-owner" v-model="projectDraft.owner" autocomplete="off" />
      </div>
      <div class="space-y-2">
        <Label for="component-demo-project-status">{{ t('components.crud.projectStatus') }}</Label>
        <Select :model-value="projectDraft.status" @update:model-value="updateProjectStatus">
          <SelectTrigger id="component-demo-project-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">
              {{ t('components.crud.active') }}
            </SelectItem>
            <SelectItem value="planned">
              {{ t('components.crud.planned') }}
            </SelectItem>
            <SelectItem value="paused">
              {{ t('components.crud.paused') }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </FormDialog>

    <DetailDrawer
      v-model:open="isDrawerOpen"
      :title="selectedProject?.name ?? t('components.crud.detailsTitle')"
      :description="t('components.crud.detailsDescription')"
      size="md"
    >
      <dl v-if="selectedProject" class="space-y-4 text-sm">
        <div class="space-y-1">
          <dt class="text-muted-foreground">
            {{ t('components.crud.projectOwner') }}
          </dt>
          <dd class="font-medium">
            {{ selectedProject.owner }}
          </dd>
        </div>
        <div class="space-y-1">
          <dt class="text-muted-foreground">
            {{ t('components.crud.projectStatus') }}
          </dt>
          <dd>
            <Badge :variant="statusVariant(selectedProject.status)">
              {{ t(`components.crud.${selectedProject.status}`) }}
            </Badge>
          </dd>
        </div>
        <div class="space-y-1">
          <dt class="text-muted-foreground">
            {{ t('components.crud.updatedAt') }}
          </dt>
          <dd class="font-medium">
            {{ selectedProject.updatedAt }}
          </dd>
        </div>
        <div class="space-y-1">
          <dt class="text-muted-foreground">
            {{ t('components.crud.projectDescription') }}
          </dt>
          <dd class="leading-6">
            {{ selectedProject.description }}
          </dd>
        </div>
      </dl>
      <template #footer="{ close }">
        <Button type="button" class="w-full" @click="close">
          {{ t('components.crud.closeDetails') }}
        </Button>
      </template>
    </DetailDrawer>
  </div>
</template>
