<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Monitor, Moon, Sun, RotateCcw } from 'lucide-vue-next'
import { useAppearanceStore } from '@/stores/appearance'
import { useTheme } from '@/composables/useTheme'
import { THEME_PRESETS, type ThemeColorId } from '@/lib/theme-presets'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const { t } = useI18n()
const appearance = useAppearanceStore()
const { themeMode, setTheme } = useTheme()

const isOpen = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

// ── Theme Mode ──────────────────────────────────────────────────────────────

const themeModes = [
  { id: 'light' as const, icon: Sun, label: computed(() => t('settings.themeLight')) },
  { id: 'dark' as const, icon: Moon, label: computed(() => t('settings.themeDark')) },
  { id: 'system' as const, icon: Monitor, label: computed(() => t('settings.themeSystem')) },
]

// ── Theme Color ─────────────────────────────────────────────────────────────

const colorLabelKey: Record<ThemeColorId, string> = {
  violet: 'appearance.colorViolet',
  blue: 'appearance.colorBlue',
  cyan: 'appearance.colorCyan',
  green: 'appearance.colorGreen',
  orange: 'appearance.colorOrange',
  rose: 'appearance.colorRose',
  slate: 'appearance.colorSlate',
  custom: 'appearance.colorCustom',
}

const customColorInput = ref(appearance.customColor)

function applyCustomColor() {
  appearance.setCustomColor(customColorInput.value)
}

// ── Layout ──────────────────────────────────────────────────────────────────

const layouts = [
  {
    id: 'sidebar' as const,
    labelKey: 'appearance.layoutSidebar',
    descKey: 'appearance.layoutSidebarDesc',
    preview: `
      <div class="flex h-full gap-0.5">
        <div class="w-5 rounded-sm bg-primary/20 flex flex-col gap-0.5 p-0.5">
          <div class="h-1.5 w-full rounded-xs bg-primary/40"></div>
          <div class="h-1 w-full rounded-xs bg-primary/20"></div>
          <div class="h-1 w-full rounded-xs bg-primary/20"></div>
        </div>
        <div class="flex-1 flex flex-col gap-0.5">
          <div class="h-2 w-full rounded-xs bg-muted"></div>
          <div class="flex-1 rounded-sm bg-muted/40"></div>
        </div>
      </div>
    `,
  },
  {
    id: 'top' as const,
    labelKey: 'appearance.layoutTop',
    descKey: 'appearance.layoutTopDesc',
    preview: `
      <div class="flex flex-col h-full gap-0.5">
        <div class="h-3 w-full rounded-xs bg-primary/20 flex items-center gap-0.5 px-0.5">
          <div class="h-1.5 w-3 rounded-xs bg-primary/40"></div>
          <div class="h-1.5 w-2 rounded-xs bg-primary/20"></div>
          <div class="h-1.5 w-2 rounded-xs bg-primary/20"></div>
        </div>
        <div class="flex-1 rounded-sm bg-muted/40"></div>
      </div>
    `,
  },
  {
    id: 'mixed' as const,
    labelKey: 'appearance.layoutMixed',
    descKey: 'appearance.layoutMixedDesc',
    preview: `
      <div class="flex flex-col h-full gap-0.5">
        <div class="h-3 w-full rounded-xs bg-primary/20 flex items-center gap-0.5 px-0.5">
          <div class="h-1.5 w-3 rounded-xs bg-primary/40"></div>
          <div class="h-1.5 w-2 rounded-xs bg-primary/20"></div>
        </div>
        <div class="flex flex-1 gap-0.5">
          <div class="w-4 rounded-sm bg-muted flex flex-col gap-0.5 p-0.5">
            <div class="h-1 w-full rounded-xs bg-primary/20"></div>
            <div class="h-1 w-full rounded-xs bg-primary/20"></div>
          </div>
          <div class="flex-1 rounded-sm bg-muted/40"></div>
        </div>
      </div>
    `,
  },
]
</script>

<template>
  <Sheet v-model:open="isOpen">
    <SheetContent side="right" class="w-80 sm:w-96 overflow-y-auto p-0">
      <SheetHeader class="px-6 py-4 border-b border-border">
        <div class="flex items-center justify-between">
          <SheetTitle>{{ t('appearance.title') }}</SheetTitle>
          <Button
            variant="ghost"
            size="sm"
            class="h-7 gap-1.5 text-xs text-muted-foreground"
            @click="appearance.reset()"
          >
            <RotateCcw class="size-3" />
            {{ t('appearance.reset') }}
          </Button>
        </div>
      </SheetHeader>

      <div class="flex flex-col gap-6 px-6 py-5">
        <!-- ── Theme Mode ──────────────────────────────────────────── -->
        <section>
          <h3 class="text-sm font-semibold mb-1">{{ t('appearance.themeMode') }}</h3>
          <p class="text-xs text-muted-foreground mb-3">{{ t('appearance.themeModeDesc') }}</p>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="mode in themeModes"
              :key="mode.id"
              :class="[
                'flex flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-2.5 transition-all text-sm',
                themeMode === mode.id
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
              ]"
              @click="setTheme(mode.id)"
            >
              <component :is="mode.icon" class="size-4" />
              <span class="text-xs font-medium">{{ mode.label.value }}</span>
            </button>
          </div>
        </section>

        <Separator />

        <!-- ── Theme Color ─────────────────────────────────────────── -->
        <section>
          <h3 class="text-sm font-semibold mb-1">{{ t('appearance.themeColor') }}</h3>
          <p class="text-xs text-muted-foreground mb-3">{{ t('appearance.themeColorDesc') }}</p>

          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="preset in THEME_PRESETS.filter((p) => p.id !== 'custom')"
              :key="preset.id"
              :title="t(colorLabelKey[preset.id])"
              :class="[
                'flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-all',
                appearance.themeColor === preset.id
                  ? 'border-primary'
                  : 'border-border hover:border-primary/50',
              ]"
              @click="appearance.setThemeColor(preset.id)"
            >
              <!-- Swatch circle -->
              <span
                class="size-6 rounded-full ring-2 ring-offset-1 ring-offset-background transition-all"
                :style="{
                  background: preset.swatch,
                  ringColor: appearance.themeColor === preset.id ? preset.swatch : 'transparent',
                }"
              />
              <span class="text-xs text-muted-foreground leading-none">
                {{ t(colorLabelKey[preset.id]) }}
              </span>
            </button>

            <!-- Custom color slot -->
            <div
              :class="[
                'flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition-all cursor-pointer relative',
                appearance.themeColor === 'custom'
                  ? 'border-primary'
                  : 'border-border hover:border-primary/50',
              ]"
            >
              <label class="cursor-pointer flex flex-col items-center gap-1.5 w-full">
                <span
                  class="size-6 rounded-full ring-2 ring-offset-1 ring-offset-background"
                  :style="{ background: appearance.customColor }"
                />
                <span class="text-xs text-muted-foreground leading-none">
                  {{ t('appearance.colorCustom') }}
                </span>
                <input
                  type="color"
                  class="sr-only"
                  :value="appearance.customColor"
                  @input="
                    (e) => {
                      appearance.setCustomColor((e.target as HTMLInputElement).value)
                    }
                  "
                />
              </label>
            </div>
          </div>
        </section>

        <Separator />

        <!-- ── Layout ──────────────────────────────────────────────── -->
        <section>
          <h3 class="text-sm font-semibold mb-1">{{ t('appearance.layout') }}</h3>
          <p class="text-xs text-muted-foreground mb-3">{{ t('appearance.layoutDesc') }}</p>

          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="layout in layouts"
              :key="layout.id"
              :class="[
                'flex flex-col gap-2 rounded-lg border-2 p-2 transition-all text-left',
                appearance.layout === layout.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50',
              ]"
              @click="appearance.setLayout(layout.id)"
            >
              <!-- Tiny layout preview -->
              <div
                class="w-full aspect-[4/3] rounded-md border border-border bg-background overflow-hidden p-1"
                v-html="layout.preview"
              />
              <div>
                <p class="text-xs font-medium leading-none mb-0.5">{{ t(layout.labelKey) }}</p>
                <p class="text-[10px] text-muted-foreground leading-tight">
                  {{ t(layout.descKey) }}
                </p>
              </div>
            </button>
          </div>
        </section>

        <Separator />

        <!-- ── Options ─────────────────────────────────────────────── -->
        <section>
          <h3 class="text-sm font-semibold mb-3">{{ t('appearance.options') }}</h3>

          <div class="flex flex-col gap-4">
            <!-- Content Width -->
            <div>
              <Label class="text-xs font-medium mb-2 block">{{
                t('appearance.contentWidth')
              }}</Label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="w in ['fluid', 'boxed'] as const"
                  :key="w"
                  :class="[
                    'rounded-md border-2 px-3 py-1.5 text-xs font-medium transition-all',
                    appearance.contentWidth === w
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50',
                  ]"
                  @click="appearance.setContentWidth(w)"
                >
                  {{
                    w === 'fluid'
                      ? t('appearance.contentWidthFluid')
                      : t('appearance.contentWidthBoxed')
                  }}
                </button>
              </div>
            </div>

            <!-- Sidebar Default (only relevant for sidebar / mixed layouts) -->
            <div v-if="appearance.layout !== 'top'">
              <Label class="text-xs font-medium mb-2 block">{{
                t('appearance.sidebarDefault')
              }}</Label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="s in ['expanded', 'collapsed'] as const"
                  :key="s"
                  :class="[
                    'rounded-md border-2 px-3 py-1.5 text-xs font-medium transition-all',
                    appearance.sidebarDefault === s
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50',
                  ]"
                  @click="appearance.setSidebarDefault(s)"
                >
                  {{
                    s === 'expanded'
                      ? t('appearance.sidebarDefaultExpanded')
                      : t('appearance.sidebarDefaultCollapsed')
                  }}
                </button>
              </div>
            </div>

            <!-- Sticky Header -->
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-medium">{{ t('appearance.stickyHeader') }}</p>
                <p class="text-[10px] text-muted-foreground">
                  {{ t('appearance.stickyHeaderDesc') }}
                </p>
              </div>
              <Switch
                :model-value="appearance.stickyHeader"
                @update:model-value="appearance.setStickyHeader($event)"
              />
            </div>
          </div>
        </section>
      </div>
    </SheetContent>
  </Sheet>
</template>
