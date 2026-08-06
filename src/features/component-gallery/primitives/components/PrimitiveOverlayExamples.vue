<script setup lang="ts">
import type { PrimitiveExamplesCopy } from '../primitive-examples'
import { PanelLeft, RefreshCw } from '@lucide/vue'
import { shallowRef } from 'vue'
import { toast } from 'vue-sonner'
import { Drawer } from '@/components/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  Dialog as DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  Sheet as SheetRoot,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import ComponentDemoCard from '../../components/ComponentDemoCard.vue'

const props = defineProps<{
  copy: PrimitiveExamplesCopy
}>()

const isDialogOpen = shallowRef(false)
const isDrawerOpen = shallowRef(false)
const isSheetOpen = shallowRef(false)
const isPreviewLoading = shallowRef(true)

function finishPreviewLoading(): void {
  // AI modified: persistent region status remains the source of truth while Sonner adds transient feedback.
  isPreviewLoading.value = false
  toast.success(props.copy.overlays.toastMessage)
}
</script>

<template>
  <div class="space-y-4" data-testid="primitive-overlay-examples">
    <ComponentDemoCard
      :title="copy.overlays.comparisonTitle"
      :description="copy.overlays.comparisonDescription"
    >
      <div class="grid min-w-0 gap-3 lg:grid-cols-3">
        <Card data-primitive-demo="ui-dialog" class="min-w-0 shadow-none">
          <CardHeader class="pb-3">
            <CardTitle class="text-sm">
              {{ copy.overlays.dialogName }}
            </CardTitle>
            <CardDescription class="break-words">
              {{ copy.overlays.dialogUse }}
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <p class="break-words text-xs text-muted-foreground">
              {{ copy.overlays.dialogAvoid }}
            </p>
            <Button
              data-testid="open-primitive-dialog"
              type="button"
              size="sm"
              variant="outline"
              @click="isDialogOpen = true"
            >
              {{ copy.overlays.openDialog }}
            </Button>
          </CardContent>
        </Card>

        <Card data-primitive-demo="admin-drawer" class="min-w-0 border-primary/30 shadow-none">
          <CardHeader class="pb-3">
            <CardTitle class="text-sm">
              {{ copy.overlays.drawerName }}
            </CardTitle>
            <CardDescription class="break-words">
              {{ copy.overlays.drawerUse }}
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <p class="break-words text-xs text-muted-foreground">
              {{ copy.overlays.drawerAvoid }}
            </p>
            <Button
              data-testid="open-admin-drawer"
              type="button"
              size="sm"
              @click="isDrawerOpen = true"
            >
              {{ copy.overlays.openDrawer }}
            </Button>
          </CardContent>
        </Card>

        <Card data-primitive-demo="ui-sheet" class="min-w-0 shadow-none">
          <CardHeader class="pb-3">
            <CardTitle class="text-sm">
              {{ copy.overlays.sheetName }}
            </CardTitle>
            <CardDescription class="break-words">
              {{ copy.overlays.sheetUse }}
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <p class="break-words text-xs text-muted-foreground">
              {{ copy.overlays.sheetAvoid }}
            </p>
            <Button
              data-testid="open-primitive-sheet"
              type="button"
              size="sm"
              variant="outline"
              @click="isSheetOpen = true"
            >
              {{ copy.overlays.openSheet }}
            </Button>
          </CardContent>
        </Card>
      </div>

      <template #usage>
        Dialog → focused task · Drawer → standardized business detail · Sheet → edge-panel
        infrastructure
      </template>
    </ComponentDemoCard>

    <div class="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
      <ComponentDemoCard
        :title="copy.overlays.compositionTitle"
        :description="copy.overlays.compositionDescription"
      >
        <section
          data-primitive-demo="ui-skeleton"
          class="min-w-0 rounded-lg border bg-muted/20 p-4"
          :aria-busy="isPreviewLoading"
          aria-live="polite"
        >
          <div class="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
            <Badge :variant="isPreviewLoading ? 'secondary' : 'outline'">
              {{ isPreviewLoading ? copy.overlays.loadingLabel : copy.overlays.readyLabel }}
            </Badge>
            <div data-primitive-demo="ui-tooltip">
              <TooltipProvider :delay-duration="100">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button
                      data-primitive-demo="ui-sonner"
                      data-testid="finish-primitive-preview"
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      :aria-label="copy.overlays.refreshPreview"
                      @click="finishPreviewLoading"
                    >
                      <RefreshCw class="size-4" aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    {{ copy.overlays.refreshHelp }}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div v-if="isPreviewLoading" class="space-y-3" :aria-label="copy.overlays.loadingLabel">
            <Skeleton class="h-4 w-2/5" />
            <Skeleton class="h-20 w-full" />
            <Skeleton class="h-4 w-3/4" />
          </div>
          <p
            v-else
            class="break-words text-sm text-muted-foreground"
            data-testid="primitive-preview-ready"
          >
            {{ copy.overlays.previewReady }}
          </p>
        </section>

        <template #usage>
          aria-busy region + visual Skeleton + named Tooltip trigger + transient Sonner result
        </template>
      </ComponentDemoCard>

      <Card data-primitive-demo="ui-sidebar" class="min-w-0 border-warning/35 bg-warning/5">
        <CardHeader>
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <PanelLeft class="size-4 shrink-0 text-warning-foreground" aria-hidden="true" />
            <CardTitle class="min-w-0 break-words text-sm">
              {{ copy.overlays.sidebarTitle }}
            </CardTitle>
          </div>
          <CardDescription class="break-words">
            {{ copy.overlays.sidebarDescription }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <Badge variant="outline">
            {{ copy.overlays.sidebarStatus }}
          </Badge>
          <div
            class="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] overflow-hidden rounded-lg border bg-background text-xs"
          >
            <div class="space-y-2 border-r bg-muted/50 p-2" aria-hidden="true">
              <span class="block h-2 rounded bg-primary/35" />
              <span class="block h-2 rounded bg-muted-foreground/25" />
              <span class="block h-2 rounded bg-muted-foreground/25" />
            </div>
            <div class="min-w-0 space-y-2 p-3">
              <p class="font-semibold">
                {{ copy.overlays.shellOwner }}
              </p>
              <p class="break-words text-muted-foreground">
                {{ copy.overlays.shellOwnerDescription }}
              </p>
            </div>
          </div>
          <code
            class="block min-w-0 break-all rounded-md bg-muted px-2 py-1.5 text-[11px] text-muted-foreground"
            translate="no"
          >
            {{ copy.overlays.sidebarSource }}
          </code>
        </CardContent>
      </Card>
    </div>

    <DialogRoot v-model:open="isDialogOpen">
      <DialogContent data-primitive-overlay="dialog" :close-label="copy.overlays.close">
        <DialogHeader>
          <DialogTitle>{{ copy.overlays.dialogTitle }}</DialogTitle>
          <DialogDescription>{{ copy.overlays.dialogDescription }}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" @click="isDialogOpen = false">
            {{ copy.overlays.close }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>

    <Drawer
      v-model:open="isDrawerOpen"
      :title="copy.overlays.drawerTitle"
      :description="copy.overlays.drawerDescription"
      size="md"
    >
      <div
        data-primitive-overlay="drawer"
        class="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground"
      >
        {{ copy.overlays.drawerUse }}
      </div>
      <template #footer="{ close }">
        <Button type="button" variant="outline" @click="close">
          {{ copy.overlays.close }}
        </Button>
      </template>
    </Drawer>

    <SheetRoot v-model:open="isSheetOpen">
      <SheetContent data-primitive-overlay="sheet" :close-label="copy.overlays.close" side="right">
        <SheetHeader>
          <SheetTitle>{{ copy.overlays.sheetTitle }}</SheetTitle>
          <SheetDescription>{{ copy.overlays.sheetDescription }}</SheetDescription>
        </SheetHeader>
        <div class="min-h-0 flex-1 px-4 text-sm text-muted-foreground">
          {{ copy.overlays.sheetUse }}
        </div>
        <div class="px-4 pb-4">
          <Button type="button" variant="outline" @click="isSheetOpen = false">
            {{ copy.overlays.close }}
          </Button>
        </div>
      </SheetContent>
    </SheetRoot>
  </div>
</template>
