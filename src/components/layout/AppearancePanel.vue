<script setup lang="ts">
import type { ThemeColorId } from '@/lib/theme-presets'
import type {
  LayoutMode,
  PageTransition,
  TabStyle,
  ThemeMode,
} from '@/stores/appearance'
import { Monitor, Moon, RotateCcw, Sun } from '@lucide/vue'
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { getAdminLayoutDefinition } from '@/components/layout/layout-contract'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { THEME_PRESETS } from '@/lib/theme-presets'
import {
  PAGE_TRANSITIONS,
  TAB_STYLES,
  useAppearanceStore,
} from '@/stores/appearance'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useI18n()
const appearance = useAppearanceStore()
const appearancePanelId = useId()

function settingLabelId(settingName: string): string {
  // AI modified: option groups and switches share unique readable names without invalid standalone labels.
  return `${appearancePanelId}-${settingName}-label`
}

function settingDescriptionId(settingName: string): string {
  return `${appearancePanelId}-${settingName}-description`
}
const activeLayoutDefinition = computed(() => getAdminLayoutDefinition(appearance.layout))
const canSetSidebarDefault = computed(() => activeLayoutDefinition.value.collapseTarget !== 'none')

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value),
})

const themeModes: readonly { id: ThemeMode, icon: typeof Sun, labelKey: string }[] = [
  { id: 'light', icon: Sun, labelKey: 'settings.themeLight' },
  { id: 'dark', icon: Moon, labelKey: 'settings.themeDark' },
  { id: 'system', icon: Monitor, labelKey: 'settings.themeSystem' },
]

const colorLabelKeys: Record<ThemeColorId, string> = {
  violet: 'appearance.colorViolet',
  blue: 'appearance.colorBlue',
  cyan: 'appearance.colorCyan',
  green: 'appearance.colorGreen',
  orange: 'appearance.colorOrange',
  rose: 'appearance.colorRose',
  slate: 'appearance.colorSlate',
  custom: 'appearance.colorCustom',
}

const layouts: readonly { id: LayoutMode, labelKey: string, descriptionKey: string }[] = [
  {
    id: 'sidebar',
    labelKey: 'appearance.layoutSidebar',
    descriptionKey: 'appearance.layoutSidebarDesc',
  },
  {
    id: 'top',
    labelKey: 'appearance.layoutTop',
    descriptionKey: 'appearance.layoutTopDesc',
  },
  {
    id: 'mixed',
    labelKey: 'appearance.layoutMixed',
    descriptionKey: 'appearance.layoutMixedDesc',
  },
]

const tabStyleLabelKeys: Record<TabStyle, string> = {
  card: 'appearance.tabStyleCard',
  chrome: 'appearance.tabStyleChrome',
  minimal: 'appearance.tabStyleMinimal',
}

const transitionLabelKeys: Record<PageTransition, string> = {
  fade: 'appearance.transitionFade',
  none: 'appearance.transitionNone',
}

function selectThemeMode(themeMode: ThemeMode): void {
  // AI modified: the settings store projects theme tokens directly; a second view transition closed the active sheet.
  appearance.setThemeMode(themeMode)
}
</script>

<template>
  <Sheet v-model:open="isOpen">
    <SheetContent side="right" class="w-full overflow-y-auto p-0 sm:max-w-md">
      <!-- AI modified: reserve the close-button hit area so expanded translations cannot overlap it. -->
      <SheetHeader class="border-b border-border py-4 pr-14 pl-6">
        <div class="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <SheetTitle class="min-w-0 break-words">
            {{ t('appearance.title') }}
          </SheetTitle>
          <SheetDescription class="sr-only">
            {{ t('appearance.layoutDesc') }}
          </SheetDescription>
          <Button
            variant="ghost"
            size="sm"
            class="h-7 gap-1.5 text-xs text-muted-foreground"
            @click="appearance.reset()"
          >
            <RotateCcw class="size-3" aria-hidden="true" />
            {{ t('appearance.reset') }}
          </Button>
        </div>
      </SheetHeader>

      <div class="adaptive-settings flex min-w-0 flex-col gap-6 px-6 py-5">
        <!-- AI modified: production settings expose only stable user-facing theme controls. -->
        <section>
          <h3 :id="settingLabelId('theme-mode')" class="mb-1 text-sm font-semibold">
            {{ t('appearance.themeMode') }}
          </h3>
          <p :id="settingDescriptionId('theme-mode')" class="mb-3 text-xs text-muted-foreground">
            {{ t('appearance.themeModeDesc') }}
          </p>
          <div
            class="settings-option-grid settings-option-grid--balanced"
            role="group"
            :aria-labelledby="settingLabelId('theme-mode')"
            :aria-describedby="settingDescriptionId('theme-mode')"
          >
            <button
              v-for="mode in themeModes"
              :key="mode.id"
              type="button"
              class="flex flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-2.5 text-sm transition-[color,background-color,border-color,box-shadow,transform]"
              :class="
                appearance.themeMode === mode.id
                  ? 'border-primary bg-primary-muted text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
              "
              :aria-pressed="appearance.themeMode === mode.id"
              @click="selectThemeMode(mode.id)"
            >
              <component :is="mode.icon" class="size-4" aria-hidden="true" />
              <span class="text-xs font-medium">{{ t(mode.labelKey) }}</span>
            </button>
          </div>
        </section>

        <Separator />

        <section>
          <h3 :id="settingLabelId('theme-color')" class="mb-1 text-sm font-semibold">
            {{ t('appearance.themeColor') }}
          </h3>
          <p :id="settingDescriptionId('theme-color')" class="mb-3 text-xs text-muted-foreground">
            {{ t('appearance.themeColorDesc') }}
          </p>
          <div
            class="settings-option-grid settings-option-grid--compact"
            role="group"
            :aria-labelledby="settingLabelId('theme-color')"
            :aria-describedby="settingDescriptionId('theme-color')"
          >
            <button
              v-for="preset in THEME_PRESETS"
              :key="preset.id"
              type="button"
              :title="t(colorLabelKeys[preset.id])"
              class="flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-[color,background-color,border-color,box-shadow,transform]"
              :class="
                appearance.themeColor === preset.id
                  ? 'border-primary bg-primary-muted'
                  : 'border-border hover:border-primary/50'
              "
              :aria-pressed="appearance.themeColor === preset.id"
              @click="appearance.setThemeColor(preset.id)"
            >
              <span
                class="size-6 rounded-full ring-2 ring-offset-1 ring-offset-background"
                :class="appearance.themeColor === preset.id ? 'ring-current' : 'ring-transparent'"
                :style="{ background: preset.swatch, color: preset.swatch }"
              />
              <span class="text-xs leading-none text-muted-foreground">
                {{ t(colorLabelKeys[preset.id]) }}
              </span>
            </button>
          </div>
        </section>

        <Separator />

        <section>
          <h3 :id="settingLabelId('layout')" class="mb-1 text-sm font-semibold">
            {{ t('appearance.layout') }}
          </h3>
          <p :id="settingDescriptionId('layout')" class="mb-3 text-xs text-muted-foreground">
            {{ t('appearance.layoutDesc') }}
          </p>
          <div
            class="settings-option-grid settings-option-grid--wide"
            role="group"
            :aria-labelledby="settingLabelId('layout')"
            :aria-describedby="settingDescriptionId('layout')"
          >
            <button
              v-for="layout in layouts"
              :key="layout.id"
              type="button"
              class="rounded-lg border-2 p-2 text-left transition-[color,background-color,border-color,box-shadow,transform]"
              :class="
                appearance.layout === layout.id
                  ? 'border-primary bg-primary-muted'
                  : 'border-border hover:border-primary/50'
              "
              :aria-pressed="appearance.layout === layout.id"
              @click="appearance.setLayout(layout.id)"
            >
              <!-- AI modified: previews consume the same grid areas and navigation placements as the live Shell. -->
              <span
                class="layout-preview"
                :data-preview-layout="layout.id"
                :style="{
                  gridTemplateAreas: getAdminLayoutDefinition(layout.id).gridTemplateAreas,
                  gridTemplateColumns: getAdminLayoutDefinition(layout.id)
                    .previewGridTemplateColumns,
                  gridTemplateRows: getAdminLayoutDefinition(layout.id).previewGridTemplateRows,
                }"
                aria-hidden="true"
              >
                <span class="layout-preview__header" />
                <span
                  v-if="getAdminLayoutDefinition(layout.id).primaryNavigation !== 'header'"
                  class="layout-preview__primary-sidebar"
                />
                <span
                  v-if="getAdminLayoutDefinition(layout.id).secondaryNavigation !== 'none'"
                  class="layout-preview__secondary-sidebar"
                />
                <span class="layout-preview__canvas" />
              </span>
              <span class="mt-2 block text-xs font-medium leading-none">
                {{ t(layout.labelKey) }}
              </span>
              <span class="mt-1 block text-[10px] leading-tight text-muted-foreground">
                {{ t(layout.descriptionKey) }}
              </span>
            </button>
          </div>
        </section>

        <Separator />

        <section>
          <h3 class="mb-3 text-sm font-semibold">
            {{ t('appearance.options') }}
          </h3>
          <div class="flex flex-col gap-4">
            <div class="grid gap-4">
              <div>
                <p :id="settingLabelId('content-width')" class="mb-2 block text-xs font-medium">
                  {{ t('appearance.contentWidth') }}
                </p>
                <div
                  class="settings-option-grid settings-option-grid--wide"
                  role="group"
                  :aria-labelledby="settingLabelId('content-width')"
                >
                  <button
                    v-for="width in ['fluid', 'boxed'] as const"
                    :key="width"
                    type="button"
                    class="rounded-md border-2 px-3 py-1.5 text-xs font-medium transition-[color,background-color,border-color,box-shadow,transform]"
                    :class="
                      appearance.contentWidth === width
                        ? 'border-primary bg-primary-muted text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    "
                    :aria-pressed="appearance.contentWidth === width"
                    @click="appearance.setContentWidth(width)"
                  >
                    {{
                      t(
                        width === 'fluid'
                          ? 'appearance.contentWidthFluid'
                          : 'appearance.contentWidthBoxed',
                      )
                    }}
                  </button>
                </div>
              </div>
              <div v-if="canSetSidebarDefault">
                <p :id="settingLabelId('sidebar-default')" class="mb-2 block text-xs font-medium">
                  {{ t('appearance.sidebarDefault') }}
                </p>
                <div
                  class="settings-option-grid settings-option-grid--wide"
                  role="group"
                  :aria-labelledby="settingLabelId('sidebar-default')"
                >
                  <button
                    v-for="sidebarState in ['expanded', 'collapsed'] as const"
                    :key="sidebarState"
                    type="button"
                    class="rounded-md border-2 px-3 py-1.5 text-xs font-medium transition-[color,background-color,border-color,box-shadow,transform]"
                    :class="
                      appearance.sidebarDefault === sidebarState
                        ? 'border-primary bg-primary-muted text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    "
                    :aria-pressed="appearance.sidebarDefault === sidebarState"
                    @click="appearance.setSidebarDefault(sidebarState)"
                  >
                    {{
                      t(
                        sidebarState === 'expanded'
                          ? 'appearance.sidebarDefaultExpanded'
                          : 'appearance.sidebarDefaultCollapsed',
                      )
                    }}
                  </button>
                </div>
              </div>
            </div>

            <div v-if="activeLayoutDefinition.canConfigureStickyHeader" class="setting-row">
              <div>
                <p :id="settingLabelId('sticky-header')" class="text-xs font-medium">
                  {{ t('appearance.stickyHeader') }}
                </p>
                <p
                  :id="settingDescriptionId('sticky-header')"
                  class="text-[10px] text-muted-foreground"
                >
                  {{ t('appearance.stickyHeaderDesc') }}
                </p>
              </div>
              <Switch
                :aria-labelledby="settingLabelId('sticky-header')"
                :aria-describedby="settingDescriptionId('sticky-header')"
                :model-value="appearance.isHeaderSticky"
                @update:model-value="appearance.setStickyHeader"
              />
            </div>

            <div class="setting-row">
              <div>
                <p :id="settingLabelId('watermark')" class="text-xs font-medium">
                  {{ t('appearance.watermark') }}
                </p>
                <p
                  :id="settingDescriptionId('watermark')"
                  class="text-[10px] text-muted-foreground"
                >
                  {{ t('appearance.watermarkDesc') }}
                </p>
              </div>
              <Switch
                :aria-labelledby="settingLabelId('watermark')"
                :aria-describedby="settingDescriptionId('watermark')"
                :model-value="appearance.isWatermarkVisible"
                @update:model-value="appearance.setWatermarkVisible"
              />
            </div>

            <div class="setting-row">
              <div>
                <p :id="settingLabelId('breadcrumb-visible')" class="text-xs font-medium">
                  {{ t('appearance.breadcrumbVisible') }}
                </p>
                <p
                  :id="settingDescriptionId('breadcrumb-visible')"
                  class="text-[10px] text-muted-foreground"
                >
                  {{ t('appearance.breadcrumbVisibleDesc') }}
                </p>
              </div>
              <Switch
                :aria-labelledby="settingLabelId('breadcrumb-visible')"
                :aria-describedby="settingDescriptionId('breadcrumb-visible')"
                :model-value="appearance.isBreadcrumbVisible"
                @update:model-value="appearance.setBreadcrumbVisible"
              />
            </div>

            <div v-if="appearance.isBreadcrumbVisible" class="setting-row">
              <div>
                <p :id="settingLabelId('breadcrumb-icon')" class="text-xs font-medium">
                  {{ t('appearance.breadcrumbIcon') }}
                </p>
                <p
                  :id="settingDescriptionId('breadcrumb-icon')"
                  class="text-[10px] text-muted-foreground"
                >
                  {{ t('appearance.breadcrumbIconDesc') }}
                </p>
              </div>
              <Switch
                :aria-labelledby="settingLabelId('breadcrumb-icon')"
                :aria-describedby="settingDescriptionId('breadcrumb-icon')"
                :model-value="appearance.hasBreadcrumbIcon"
                @update:model-value="appearance.setBreadcrumbIcon"
              />
            </div>

            <div class="setting-row">
              <div>
                <p :id="settingLabelId('tabs-visible')" class="text-xs font-medium">
                  {{ t('appearance.tabsVisible') }}
                </p>
                <p
                  :id="settingDescriptionId('tabs-visible')"
                  class="text-[10px] text-muted-foreground"
                >
                  {{ t('appearance.tabsVisibleDesc') }}
                </p>
              </div>
              <Switch
                :aria-labelledby="settingLabelId('tabs-visible')"
                :aria-describedby="settingDescriptionId('tabs-visible')"
                :model-value="appearance.isTabsVisible"
                @update:model-value="appearance.setTabsVisible"
              />
            </div>

            <div v-if="appearance.isTabsVisible">
              <p :id="settingLabelId('tab-style')" class="mb-2 block text-xs font-medium">
                {{ t('appearance.tabStyle') }}
              </p>
              <div
                class="settings-option-grid settings-option-grid--balanced"
                role="group"
                :aria-labelledby="settingLabelId('tab-style')"
              >
                <button
                  v-for="style in TAB_STYLES"
                  :key="style"
                  type="button"
                  class="rounded-md border-2 px-2 py-1.5 text-xs font-medium transition-[color,background-color,border-color,box-shadow,transform]"
                  :class="
                    appearance.tabStyle === style
                      ? 'border-primary bg-primary-muted text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  "
                  :aria-pressed="appearance.tabStyle === style"
                  @click="appearance.setTabStyle(style)"
                >
                  {{ t(tabStyleLabelKeys[style]) }}
                </button>
              </div>
            </div>

            <div class="setting-row">
              <div>
                <p :id="settingLabelId('footer-visible')" class="text-xs font-medium">
                  {{ t('appearance.footerVisible') }}
                </p>
                <p
                  :id="settingDescriptionId('footer-visible')"
                  class="text-[10px] text-muted-foreground"
                >
                  {{ t('appearance.footerVisibleDesc') }}
                </p>
              </div>
              <Switch
                :aria-labelledby="settingLabelId('footer-visible')"
                :aria-describedby="settingDescriptionId('footer-visible')"
                :model-value="appearance.isFooterVisible"
                @update:model-value="appearance.setFooterVisible"
              />
            </div>

            <div>
              <p :id="settingLabelId('page-transition')" class="mb-2 block text-xs font-medium">
                {{ t('appearance.pageTransition') }}
              </p>
              <div
                class="settings-option-grid settings-option-grid--balanced"
                role="group"
                :aria-labelledby="settingLabelId('page-transition')"
              >
                <button
                  v-for="transition in PAGE_TRANSITIONS"
                  :key="transition"
                  type="button"
                  class="rounded-md border-2 px-2 py-1.5 text-xs font-medium transition-[color,background-color,border-color,box-shadow,transform]"
                  :class="
                    appearance.pageTransition === transition
                      ? 'border-primary bg-primary-muted text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  "
                  :aria-pressed="appearance.pageTransition === transition"
                  @click="appearance.setPageTransition(transition)"
                >
                  {{ t(transitionLabelKeys[transition]) }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SheetContent>
  </Sheet>
</template>

<style scoped>
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.setting-row > :first-child,
.adaptive-settings section,
.adaptive-settings section > div {
  min-width: 0;
}

.adaptive-settings button,
.setting-row p {
  overflow-wrap: anywhere;
}

/* AI modified: option density follows the Sheet's content width and rem-scaled copy, not viewport breakpoints. */
.settings-option-grid {
  --settings-option-min-width: 7rem;

  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--settings-option-min-width)), 1fr));
  gap: 0.5rem;
}

.settings-option-grid--compact {
  --settings-option-min-width: 5.5rem;
}

.settings-option-grid--balanced {
  --settings-option-min-width: 7rem;
}

.settings-option-grid--wide {
  --settings-option-min-width: 10rem;
}

.layout-preview {
  display: grid;
  width: 100%;
  aspect-ratio: 16 / 7;
  gap: 0.125rem;
  padding: 0.2rem;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  background: var(--background);
}

.layout-preview > span {
  display: block;
  border-radius: 0.125rem;
}

.layout-preview__header {
  grid-area: header;
  background: color-mix(in oklch, var(--primary) 24%, var(--muted));
}

.layout-preview__primary-sidebar {
  grid-area: primary;
  background: color-mix(in oklch, var(--primary) 18%, var(--sidebar));
}

.layout-preview__secondary-sidebar {
  grid-area: secondary;
  background: var(--muted);
}

.layout-preview__canvas {
  grid-area: body;
  background: color-mix(in oklch, var(--muted) 52%, transparent);
}
</style>
