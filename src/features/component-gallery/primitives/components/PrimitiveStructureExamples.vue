<script setup lang="ts">
import type { PrimitiveExamplesCopy } from '../primitive-examples'
import { computed, shallowRef } from 'vue'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  Pagination as PaginationRoot,
} from '@/components/ui/pagination'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import ComponentDemoCard from '../../components/ComponentDemoCard.vue'

type PrimitiveAction = 'delete' | 'duplicate' | 'export'

const props = defineProps<{
  copy: PrimitiveExamplesCopy
}>()

const selectedAction = shallowRef<PrimitiveAction | null>(null)
const currentPage = shallowRef(1)
const validatedWorkspaceName = shallowRef('')

const selectedActionLabel = computed(() => {
  if (!selectedAction.value)
    return ''

  const actionLabels: Record<PrimitiveAction, string> = {
    delete: props.copy.structure.deleteAction,
    duplicate: props.copy.structure.duplicateAction,
    export: props.copy.structure.exportAction,
  }
  return props.copy.structure.actionSelected.replace('{action}', actionLabels[selectedAction.value])
})

const paginationStatus = computed(() =>
  props.copy.structure.paginationStatus.replace('{page}', String(currentPage.value)),
)

const formStatus = computed(() =>
  props.copy.structure.saved.replace('{name}', validatedWorkspaceName.value),
)

function requireWorkspaceName(fieldValue: unknown): true | string {
  return typeof fieldValue === 'string' && fieldValue.trim().length > 0
    ? true
    : props.copy.structure.fieldRequired
}

function validateWorkspace(submittedFields: Record<string, unknown>): void {
  const workspaceName = submittedFields.workspaceName
  if (typeof workspaceName !== 'string')
    return

  // AI modified: the visible result demonstrates Form's public submit contract without adding business persistence.
  validatedWorkspaceName.value = workspaceName.trim()
}
</script>

<template>
  <div class="grid min-w-0 gap-4 xl:grid-cols-2" data-testid="primitive-structure-examples">
    <ComponentDemoCard
      :title="copy.structure.navigationTitle"
      :description="copy.structure.navigationDescription"
    >
      <div data-primitive-demo="ui-breadcrumb" class="min-w-0 rounded-lg border bg-muted/20 p-3">
        <Breadcrumb :aria-label="copy.structure.breadcrumbLabel">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#primitive-foundations">
                {{ copy.structure.breadcrumbHome }}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#primitive-structure-title">
                {{ copy.structure.breadcrumbComponents }}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{{ copy.structure.breadcrumbCurrent }}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div data-primitive-demo="ui-dropdown-menu" class="flex min-w-0 flex-wrap items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button type="button" variant="outline">
              {{ copy.structure.actionMenu }}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent :aria-label="copy.structure.actionMenuLabel" align="start">
            <DropdownMenuLabel>{{ copy.structure.actionMenuLabel }}</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem @select="selectedAction = 'export'">
                {{ copy.structure.exportAction }}
              </DropdownMenuItem>
              <DropdownMenuItem @select="selectedAction = 'duplicate'">
                {{ copy.structure.duplicateAction }}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" @select="selectedAction = 'delete'">
              {{ copy.structure.deleteAction }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <p
          class="min-w-0 break-words text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {{ selectedActionLabel }}
        </p>
      </div>

      <template #usage>
        Breadcrumb → AppBreadcrumb · DropdownMenu → visible, named secondary actions
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="copy.structure.formTitle"
      :description="copy.structure.formDescription"
    >
      <Form
        data-primitive-demo="ui-form"
        class="space-y-3 rounded-lg border bg-muted/20 p-3"
        @submit="validateWorkspace"
      >
        <FormField v-slot="{ componentField }" name="workspaceName" :rules="requireWorkspaceName">
          <FormItem>
            <FormLabel>{{ copy.structure.fieldLabel }}</FormLabel>
            <FormControl>
              <Input v-bind="componentField" :placeholder="copy.structure.fieldPlaceholder" />
            </FormControl>
            <FormDescription>{{ copy.structure.fieldHelp }}</FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>
        <div class="flex min-w-0 flex-wrap items-center gap-3">
          <Button type="submit" size="sm">
            {{ copy.structure.save }}
          </Button>
          <p
            class="min-w-0 break-words text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            {{ validatedWorkspaceName ? formStatus : '' }}
          </p>
        </div>
      </Form>

      <div data-primitive-demo="ui-pagination" class="min-w-0 space-y-2 rounded-lg border p-3">
        <p class="text-center text-sm text-muted-foreground" role="status" aria-live="polite">
          {{ paginationStatus }}
        </p>
        <PaginationRoot
          v-model:page="currentPage"
          :total="50"
          :items-per-page="10"
          :sibling-count="1"
          show-edges
          :aria-label="copy.structure.paginationLabel"
        >
          <PaginationContent v-slot="{ items }">
            <PaginationPrevious :aria-label="copy.structure.previousPage" size="icon-sm" />
            <template v-for="(paginationEntry, paginationIndex) in items" :key="paginationIndex">
              <PaginationItem
                v-if="paginationEntry.type === 'page'"
                :value="paginationEntry.value"
                :is-active="paginationEntry.value === currentPage"
                size="icon-sm"
              >
                {{ paginationEntry.value }}
              </PaginationItem>
              <PaginationEllipsis v-else :index="paginationIndex">
                <span aria-hidden="true">…</span>
                <span class="sr-only">{{ copy.structure.morePages }}</span>
              </PaginationEllipsis>
            </template>
            <PaginationNext :aria-label="copy.structure.nextPage" size="icon-sm" />
          </PaginationContent>
        </PaginationRoot>
      </div>

      <template #usage>
        Form primitives → VeeValidate field context · Pagination primitives → DataTable / ProTable
        contract
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="copy.structure.panelsTitle"
      :description="copy.structure.panelsDescription"
    >
      <ResizablePanelGroup
        data-primitive-demo="ui-resizable"
        direction="horizontal"
        class="min-h-40 overflow-hidden rounded-lg border"
      >
        <ResizablePanel :default-size="58" :min-size="30">
          <div
            class="flex h-full min-w-0 items-center justify-center bg-muted/30 p-4 text-center text-sm font-medium"
          >
            {{ copy.structure.primaryPanel }}
          </div>
        </ResizablePanel>
        <ResizableHandle with-handle :aria-label="copy.structure.resizeHandle" />
        <ResizablePanel :default-size="42" :min-size="25">
          <div
            class="flex h-full min-w-0 items-center justify-center p-4 text-center text-sm font-medium"
          >
            {{ copy.structure.secondaryPanel }}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <Separator data-primitive-demo="ui-separator" :decorative="false" />

      <ScrollArea
        data-primitive-demo="ui-scroll-area"
        class="h-40 rounded-lg border"
        tabindex="0"
        :aria-label="copy.structure.scrollAreaLabel"
      >
        <ol class="space-y-3 p-4 text-sm">
          <li
            v-for="(activityEntry, activityIndex) in copy.structure.activityEntries"
            :key="activityEntry"
            class="flex min-w-0 gap-3"
          >
            <span class="font-mono text-xs font-semibold text-primary">0{{ activityIndex + 1 }}</span>
            <span class="min-w-0 break-words text-muted-foreground">{{ activityEntry }}</span>
          </li>
        </ol>
      </ScrollArea>

      <template #usage>
        Resizable → editor workspace · ScrollArea → bounded history only · Separator → explicit
        region boundary
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="copy.structure.tableTitle"
      :description="copy.structure.tableDescription"
    >
      <div data-primitive-demo="ui-table" class="min-w-0 rounded-lg border">
        <Table>
          <TableCaption>{{ copy.structure.tableCaption }}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead
                v-for="tableHeader in copy.structure.tableHeaders"
                :key="tableHeader"
                scope="col"
              >
                {{ tableHeader }}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="tableRow in copy.structure.tableRows" :key="tableRow[0]">
              <TableCell class="font-medium">
                {{ tableRow[0] }}
              </TableCell>
              <TableCell>{{ tableRow[1] }}</TableCell>
              <TableCell>{{ tableRow[2] }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <template #usage>
        Table → native semantics and containment · DataTable / ProTable → behavior and state
      </template>
    </ComponentDemoCard>
  </div>
</template>
