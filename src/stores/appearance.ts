import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { type ThemeColorId, THEME_COLOR_IDS } from '@/lib/theme-presets'

export type LayoutMode = 'sidebar' | 'top' | 'mixed'
export type ContentWidth = 'fluid' | 'boxed'
export type SidebarDefault = 'expanded' | 'collapsed'

const STORAGE_KEY = 'appearance'

export interface AppearanceState {
  themeColor: ThemeColorId
  customColor: string
  layout: LayoutMode
  contentWidth: ContentWidth
  sidebarDefault: SidebarDefault
  stickyHeader: boolean
}

function loadFromStorage(): Partial<AppearanceState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<AppearanceState>
  } catch {
    return {}
  }
}

function isValidThemeColor(v: unknown): v is ThemeColorId {
  return typeof v === 'string' && THEME_COLOR_IDS.includes(v as ThemeColorId)
}

function isValidLayout(v: unknown): v is LayoutMode {
  return v === 'sidebar' || v === 'top' || v === 'mixed'
}

function isValidContentWidth(v: unknown): v is ContentWidth {
  return v === 'fluid' || v === 'boxed'
}

function isValidSidebarDefault(v: unknown): v is SidebarDefault {
  return v === 'expanded' || v === 'collapsed'
}

export const useAppearanceStore = defineStore('appearance', () => {
  const stored = loadFromStorage()

  const themeColor = ref<ThemeColorId>(
    isValidThemeColor(stored.themeColor) ? stored.themeColor : 'violet',
  )
  const customColor = ref<string>(
    typeof stored.customColor === 'string' ? stored.customColor : '#8b5cf6',
  )
  const layout = ref<LayoutMode>(isValidLayout(stored.layout) ? stored.layout : 'sidebar')
  const contentWidth = ref<ContentWidth>(
    isValidContentWidth(stored.contentWidth) ? stored.contentWidth : 'fluid',
  )
  const sidebarDefault = ref<SidebarDefault>(
    isValidSidebarDefault(stored.sidebarDefault) ? stored.sidebarDefault : 'expanded',
  )
  const stickyHeader = ref<boolean>(
    typeof stored.stickyHeader === 'boolean' ? stored.stickyHeader : true,
  )

  function persist() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        themeColor: themeColor.value,
        customColor: customColor.value,
        layout: layout.value,
        contentWidth: contentWidth.value,
        sidebarDefault: sidebarDefault.value,
        stickyHeader: stickyHeader.value,
      }),
    )
  }

  watch([themeColor, customColor, layout, contentWidth, sidebarDefault, stickyHeader], persist, {
    deep: true,
  })

  function setThemeColor(id: ThemeColorId) {
    themeColor.value = id
  }

  function setCustomColor(hex: string) {
    customColor.value = hex
    themeColor.value = 'custom'
  }

  function setLayout(mode: LayoutMode) {
    layout.value = mode
  }

  function setContentWidth(w: ContentWidth) {
    contentWidth.value = w
  }

  function setSidebarDefault(s: SidebarDefault) {
    sidebarDefault.value = s
  }

  function setStickyHeader(v: boolean) {
    stickyHeader.value = v
  }

  function reset() {
    themeColor.value = 'violet'
    customColor.value = '#8b5cf6'
    layout.value = 'sidebar'
    contentWidth.value = 'fluid'
    sidebarDefault.value = 'expanded'
    stickyHeader.value = true
  }

  return {
    themeColor,
    customColor,
    layout,
    contentWidth,
    sidebarDefault,
    stickyHeader,
    setThemeColor,
    setCustomColor,
    setLayout,
    setContentWidth,
    setSidebarDefault,
    setStickyHeader,
    reset,
  }
})
