import type { PersistenceOptions } from 'pinia-plugin-persistedstate'
import type { ThemeColorId } from '@/lib/theme-presets'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getBrowserStorage, safeStorageGet, safeStorageSet } from '@/lib/browser-storage'
import { THEME_COLOR_IDS } from '@/lib/theme-presets'

export const THEME_MODES = ['system', 'light', 'dark'] as const
export const SUPPORTED_APP_LOCALES = ['zh-CN', 'en-US'] as const
export const COMPONENT_SIZES = ['default', 'sm', 'md', 'lg'] as const
export const LAYOUT_MODES = [
  'sidebar',
  'top',
  'mixed',
  'sidebar-hybrid-header-first',
  'header-hybrid-sidebar-first',
  'header-hybrid-header-first',
] as const
export const CONTENT_WIDTHS = ['fluid', 'boxed'] as const
export const SIDEBAR_DEFAULTS = ['expanded', 'collapsed'] as const
export const TAB_STYLES = ['card', 'chrome', 'minimal'] as const
export const PAGE_TRANSITIONS = ['fade-slide', 'fade', 'none'] as const

export type ThemeMode = (typeof THEME_MODES)[number]
export type ResolvedTheme = Exclude<ThemeMode, 'system'>
export type AppLocale = (typeof SUPPORTED_APP_LOCALES)[number]
export type ComponentSize = (typeof COMPONENT_SIZES)[number]
export type LayoutMode = (typeof LAYOUT_MODES)[number]
export type ContentWidth = (typeof CONTENT_WIDTHS)[number]
export type SidebarDefault = (typeof SIDEBAR_DEFAULTS)[number]
export type TabStyle = (typeof TAB_STYLES)[number]
export type PageTransition = (typeof PAGE_TRANSITIONS)[number]
export type SemanticColor = 'success' | 'warning' | 'destructive'

export interface AppSettings {
  themeMode: ThemeMode
  locale: AppLocale
  componentSize: ComponentSize
  themeColor: ThemeColorId
  customColor: string
  successColor: string
  warningColor: string
  destructiveColor: string
  layout: LayoutMode
  contentWidth: ContentWidth
  sidebarDefault: SidebarDefault
  isHeaderSticky: boolean
  isWatermarkVisible: boolean
  isBreadcrumbVisible: boolean
  hasBreadcrumbIcon: boolean
  isTabsVisible: boolean
  tabStyle: TabStyle
  isFooterVisible: boolean
  pageTransition: PageTransition
}

/** @deprecated Use AppSettings. */
export type AppearanceState = AppSettings

export type AppSettingsPresetId = 'default' | 'ocean' | 'compact' | 'midnight'

export interface AppSettingsPreset {
  id: AppSettingsPresetId
  labelKey: string
  descriptionKey: string
  settings: AppSettings
}

export const APP_SETTINGS_STORAGE_KEY = 'appearance'

export const DEFAULT_APP_SETTINGS: AppSettings = {
  themeMode: 'system',
  locale: 'zh-CN',
  componentSize: 'default',
  themeColor: 'violet',
  customColor: '#8b5cf6',
  successColor: '#16a34a',
  warningColor: '#d97706',
  destructiveColor: '#dc2626',
  layout: 'sidebar',
  contentWidth: 'fluid',
  sidebarDefault: 'expanded',
  isHeaderSticky: true,
  isWatermarkVisible: false,
  isBreadcrumbVisible: true,
  hasBreadcrumbIcon: false,
  isTabsVisible: true,
  tabStyle: 'card',
  isFooterVisible: true,
  pageTransition: 'fade-slide',
}

export const APP_SETTINGS_PRESETS: readonly AppSettingsPreset[] = [
  {
    id: 'default',
    labelKey: 'appearance.presets.defaultLabel',
    descriptionKey: 'appearance.presets.defaultDescription',
    settings: { ...DEFAULT_APP_SETTINGS },
  },
  {
    id: 'ocean',
    labelKey: 'appearance.presets.oceanLabel',
    descriptionKey: 'appearance.presets.oceanDescription',
    settings: {
      ...DEFAULT_APP_SETTINGS,
      themeColor: 'blue',
      customColor: '#2563eb',
      successColor: '#059669',
      warningColor: '#ca8a04',
      destructiveColor: '#e11d48',
      layout: 'top',
      tabStyle: 'minimal',
    },
  },
  {
    id: 'compact',
    labelKey: 'appearance.presets.compactLabel',
    descriptionKey: 'appearance.presets.compactDescription',
    settings: {
      ...DEFAULT_APP_SETTINGS,
      componentSize: 'sm',
      layout: 'mixed',
      contentWidth: 'boxed',
      sidebarDefault: 'collapsed',
      tabStyle: 'chrome',
      isFooterVisible: false,
    },
  },
  {
    id: 'midnight',
    labelKey: 'appearance.presets.midnightLabel',
    descriptionKey: 'appearance.presets.midnightDescription',
    settings: {
      ...DEFAULT_APP_SETTINGS,
      themeMode: 'dark',
      componentSize: 'md',
      themeColor: 'cyan',
      customColor: '#0891b2',
      successColor: '#22c55e',
      warningColor: '#f59e0b',
      destructiveColor: '#f43f5e',
      layout: 'header-hybrid-header-first',
      sidebarDefault: 'collapsed',
      isWatermarkVisible: true,
      tabStyle: 'minimal',
      isFooterVisible: false,
      pageTransition: 'fade',
    },
  },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)
}

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && THEME_MODES.includes(value as ThemeMode)
}

function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === 'string' && SUPPORTED_APP_LOCALES.includes(value as AppLocale)
}

function isComponentSize(value: unknown): value is ComponentSize {
  return typeof value === 'string' && COMPONENT_SIZES.includes(value as ComponentSize)
}

function isThemeColor(value: unknown): value is ThemeColorId {
  return typeof value === 'string' && THEME_COLOR_IDS.includes(value as ThemeColorId)
}

function isLayoutMode(value: unknown): value is LayoutMode {
  return typeof value === 'string' && LAYOUT_MODES.includes(value as LayoutMode)
}

function isContentWidth(value: unknown): value is ContentWidth {
  return typeof value === 'string' && CONTENT_WIDTHS.includes(value as ContentWidth)
}

function isSidebarDefault(value: unknown): value is SidebarDefault {
  return typeof value === 'string' && SIDEBAR_DEFAULTS.includes(value as SidebarDefault)
}

function isTabStyle(value: unknown): value is TabStyle {
  return typeof value === 'string' && TAB_STYLES.includes(value as TabStyle)
}

function isPageTransition(value: unknown): value is PageTransition {
  return typeof value === 'string' && PAGE_TRANSITIONS.includes(value as PageTransition)
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/**
 * Reads persisted settings defensively and migrates the legacy stickyHeader field.
 */
export function readPersistedAppSettings(serializedSettings: string | null): AppSettings {
  if (!serializedSettings) return { ...DEFAULT_APP_SETTINGS }

  try {
    const storedValue: unknown = JSON.parse(serializedSettings)
    if (!isRecord(storedValue)) return { ...DEFAULT_APP_SETTINGS }

    // AI modified: validate every persisted preference before it reaches DOM classes or CSS variables.
    return {
      themeMode: isThemeMode(storedValue.themeMode)
        ? storedValue.themeMode
        : DEFAULT_APP_SETTINGS.themeMode,
      locale: isAppLocale(storedValue.locale) ? storedValue.locale : DEFAULT_APP_SETTINGS.locale,
      componentSize: isComponentSize(storedValue.componentSize)
        ? storedValue.componentSize
        : DEFAULT_APP_SETTINGS.componentSize,
      themeColor: isThemeColor(storedValue.themeColor)
        ? storedValue.themeColor
        : DEFAULT_APP_SETTINGS.themeColor,
      customColor: isHexColor(storedValue.customColor)
        ? storedValue.customColor
        : DEFAULT_APP_SETTINGS.customColor,
      successColor: isHexColor(storedValue.successColor)
        ? storedValue.successColor
        : DEFAULT_APP_SETTINGS.successColor,
      warningColor: isHexColor(storedValue.warningColor)
        ? storedValue.warningColor
        : DEFAULT_APP_SETTINGS.warningColor,
      destructiveColor: isHexColor(storedValue.destructiveColor)
        ? storedValue.destructiveColor
        : DEFAULT_APP_SETTINGS.destructiveColor,
      layout: isLayoutMode(storedValue.layout) ? storedValue.layout : DEFAULT_APP_SETTINGS.layout,
      contentWidth: isContentWidth(storedValue.contentWidth)
        ? storedValue.contentWidth
        : DEFAULT_APP_SETTINGS.contentWidth,
      sidebarDefault: isSidebarDefault(storedValue.sidebarDefault)
        ? storedValue.sidebarDefault
        : DEFAULT_APP_SETTINGS.sidebarDefault,
      isHeaderSticky: readBoolean(
        storedValue.isHeaderSticky ?? storedValue.stickyHeader,
        DEFAULT_APP_SETTINGS.isHeaderSticky,
      ),
      isWatermarkVisible: readBoolean(
        storedValue.isWatermarkVisible,
        DEFAULT_APP_SETTINGS.isWatermarkVisible,
      ),
      isBreadcrumbVisible: readBoolean(
        storedValue.isBreadcrumbVisible,
        DEFAULT_APP_SETTINGS.isBreadcrumbVisible,
      ),
      hasBreadcrumbIcon: readBoolean(
        storedValue.hasBreadcrumbIcon,
        DEFAULT_APP_SETTINGS.hasBreadcrumbIcon,
      ),
      isTabsVisible: readBoolean(storedValue.isTabsVisible, DEFAULT_APP_SETTINGS.isTabsVisible),
      tabStyle: isTabStyle(storedValue.tabStyle)
        ? storedValue.tabStyle
        : DEFAULT_APP_SETTINGS.tabStyle,
      isFooterVisible: readBoolean(
        storedValue.isFooterVisible,
        DEFAULT_APP_SETTINGS.isFooterVisible,
      ),
      pageTransition: isPageTransition(storedValue.pageTransition)
        ? storedValue.pageTransition
        : DEFAULT_APP_SETTINGS.pageTransition,
    }
  } catch {
    return { ...DEFAULT_APP_SETTINGS }
  }
}

function readLegacyThemeMode(): ThemeMode | undefined {
  const storedThemeMode = safeStorageGet(getBrowserStorage('local'), 'theme')
  return isThemeMode(storedThemeMode) ? storedThemeMode : undefined
}

function readLegacyLocale(): AppLocale | undefined {
  const storedLocale = safeStorageGet(getBrowserStorage('local'), 'locale')
  return isAppLocale(storedLocale) ? storedLocale : undefined
}

function readSettingsWithLegacyFallback(serializedSettings: string | null): AppSettings {
  const persistedSettings = readPersistedAppSettings(serializedSettings)
  let storedValue: unknown

  try {
    storedValue = serializedSettings ? JSON.parse(serializedSettings) : undefined
  } catch {
    storedValue = undefined
  }

  const hasStoredThemeMode = isRecord(storedValue) && isThemeMode(storedValue.themeMode)
  const hasStoredLocale = isRecord(storedValue) && isAppLocale(storedValue.locale)

  // AI modified: legacy keys migrate only missing preferences and never override modern AppSettings.
  return {
    ...persistedSettings,
    themeMode: hasStoredThemeMode
      ? persistedSettings.themeMode
      : (readLegacyThemeMode() ?? persistedSettings.themeMode),
    locale: hasStoredLocale
      ? persistedSettings.locale
      : (readLegacyLocale() ?? persistedSettings.locale),
  }
}

export function readStoredAppSettings(): AppSettings {
  return readSettingsWithLegacyFallback(
    safeStorageGet(getBrowserStorage('local'), APP_SETTINGS_STORAGE_KEY),
  )
}

export function resolveThemeMode(themeMode: ThemeMode): ResolvedTheme {
  if (themeMode !== 'system') return themeMode

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const persistedSettingKeys: Array<keyof AppSettings> = [
  'themeMode',
  'locale',
  'componentSize',
  'themeColor',
  'customColor',
  'successColor',
  'warningColor',
  'destructiveColor',
  'layout',
  'contentWidth',
  'sidebarDefault',
  'isHeaderSticky',
  'isWatermarkVisible',
  'isBreadcrumbVisible',
  'hasBreadcrumbIcon',
  'isTabsVisible',
  'tabStyle',
  'isFooterVisible',
  'pageTransition',
]

const appearanceStorage = {
  getItem: (key: string): string | null => safeStorageGet(getBrowserStorage('local'), key),
  setItem: (key: string, storedValue: string): void => {
    // AI modified: appearance persistence degrades to memory when browser storage is blocked or full.
    safeStorageSet(getBrowserStorage('local'), key, storedValue)
  },
}

const appearancePersistence = {
  key: APP_SETTINGS_STORAGE_KEY,
  storage: appearanceStorage,
  pick: persistedSettingKeys,
  serializer: {
    serialize: (state) => JSON.stringify(state),
    deserialize: (serializedSettings) => readSettingsWithLegacyFallback(serializedSettings),
  },
} satisfies PersistenceOptions<AppSettings>

export const useAppearanceStore = defineStore(
  'appearance',
  () => {
    const initialSettings = readStoredAppSettings()

    const themeMode = ref<ThemeMode>(initialSettings.themeMode)
    const locale = ref<AppLocale>(initialSettings.locale)
    const componentSize = ref<ComponentSize>(initialSettings.componentSize)
    const themeColor = ref<ThemeColorId>(initialSettings.themeColor)
    const customColor = ref(initialSettings.customColor)
    const successColor = ref(initialSettings.successColor)
    const warningColor = ref(initialSettings.warningColor)
    const destructiveColor = ref(initialSettings.destructiveColor)
    const layout = ref<LayoutMode>(initialSettings.layout)
    const contentWidth = ref<ContentWidth>(initialSettings.contentWidth)
    const sidebarDefault = ref<SidebarDefault>(initialSettings.sidebarDefault)
    const isHeaderSticky = ref(initialSettings.isHeaderSticky)
    const isWatermarkVisible = ref(initialSettings.isWatermarkVisible)
    const isBreadcrumbVisible = ref(initialSettings.isBreadcrumbVisible)
    const hasBreadcrumbIcon = ref(initialSettings.hasBreadcrumbIcon)
    const isTabsVisible = ref(initialSettings.isTabsVisible)
    const tabStyle = ref<TabStyle>(initialSettings.tabStyle)
    const isFooterVisible = ref(initialSettings.isFooterVisible)
    const pageTransition = ref<PageTransition>(initialSettings.pageTransition)

    const stickyHeader = computed({
      get: () => isHeaderSticky.value,
      set: (value) => setStickyHeader(value),
    })

    const settings = computed<AppSettings>(() => ({
      themeMode: themeMode.value,
      locale: locale.value,
      componentSize: componentSize.value,
      themeColor: themeColor.value,
      customColor: customColor.value,
      successColor: successColor.value,
      warningColor: warningColor.value,
      destructiveColor: destructiveColor.value,
      layout: layout.value,
      contentWidth: contentWidth.value,
      sidebarDefault: sidebarDefault.value,
      isHeaderSticky: isHeaderSticky.value,
      isWatermarkVisible: isWatermarkVisible.value,
      isBreadcrumbVisible: isBreadcrumbVisible.value,
      hasBreadcrumbIcon: hasBreadcrumbIcon.value,
      isTabsVisible: isTabsVisible.value,
      tabStyle: tabStyle.value,
      isFooterVisible: isFooterVisible.value,
      pageTransition: pageTransition.value,
    }))

    function setThemeMode(mode: ThemeMode): void {
      themeMode.value = mode
    }

    function setLocale(nextLocale: AppLocale): void {
      locale.value = nextLocale
    }

    function setComponentSize(size: ComponentSize): void {
      componentSize.value = size
    }

    function setThemeColor(id: ThemeColorId): void {
      themeColor.value = id
    }

    function setCustomColor(color: string): void {
      if (!isHexColor(color)) return
      customColor.value = color
      themeColor.value = 'custom'
    }

    function setSemanticColor(semanticColor: SemanticColor, color: string): void {
      if (!isHexColor(color)) return
      if (semanticColor === 'success') successColor.value = color
      else if (semanticColor === 'warning') warningColor.value = color
      else destructiveColor.value = color
    }

    function setLayout(mode: LayoutMode): void {
      layout.value = mode
    }

    function setContentWidth(width: ContentWidth): void {
      contentWidth.value = width
    }

    function setSidebarDefault(state: SidebarDefault): void {
      sidebarDefault.value = state
    }

    function setStickyHeader(isSticky: boolean): void {
      isHeaderSticky.value = isSticky
    }

    function setWatermarkVisible(isVisible: boolean): void {
      isWatermarkVisible.value = isVisible
    }

    function setBreadcrumbVisible(isVisible: boolean): void {
      isBreadcrumbVisible.value = isVisible
    }

    function setBreadcrumbIcon(hasIcon: boolean): void {
      hasBreadcrumbIcon.value = hasIcon
    }

    function setTabsVisible(isVisible: boolean): void {
      isTabsVisible.value = isVisible
    }

    function setTabStyle(style: TabStyle): void {
      tabStyle.value = style
    }

    function setFooterVisible(isVisible: boolean): void {
      isFooterVisible.value = isVisible
    }

    function setPageTransition(transition: PageTransition): void {
      pageTransition.value = transition
    }

    function applySettingsValues(nextSettings: AppSettings): void {
      // AI modified: update the complete settings contract together so presets never leave stale switches behind.
      themeMode.value = nextSettings.themeMode
      locale.value = nextSettings.locale
      componentSize.value = nextSettings.componentSize
      themeColor.value = nextSettings.themeColor
      customColor.value = nextSettings.customColor
      successColor.value = nextSettings.successColor
      warningColor.value = nextSettings.warningColor
      destructiveColor.value = nextSettings.destructiveColor
      layout.value = nextSettings.layout
      contentWidth.value = nextSettings.contentWidth
      sidebarDefault.value = nextSettings.sidebarDefault
      isHeaderSticky.value = nextSettings.isHeaderSticky
      isWatermarkVisible.value = nextSettings.isWatermarkVisible
      isBreadcrumbVisible.value = nextSettings.isBreadcrumbVisible
      hasBreadcrumbIcon.value = nextSettings.hasBreadcrumbIcon
      isTabsVisible.value = nextSettings.isTabsVisible
      tabStyle.value = nextSettings.tabStyle
      isFooterVisible.value = nextSettings.isFooterVisible
      pageTransition.value = nextSettings.pageTransition
    }

    function applyPreset(presetId: AppSettingsPresetId): void {
      const preset = APP_SETTINGS_PRESETS.find((candidate) => candidate.id === presetId)
      if (preset) applySettingsValues(preset.settings)
    }

    function reset(): void {
      applySettingsValues(DEFAULT_APP_SETTINGS)
    }

    return {
      settings,
      themeMode,
      locale,
      componentSize,
      themeColor,
      customColor,
      successColor,
      warningColor,
      destructiveColor,
      layout,
      contentWidth,
      sidebarDefault,
      stickyHeader,
      isHeaderSticky,
      isWatermarkVisible,
      isBreadcrumbVisible,
      hasBreadcrumbIcon,
      isTabsVisible,
      tabStyle,
      isFooterVisible,
      pageTransition,
      setThemeMode,
      setLocale,
      setComponentSize,
      setThemeColor,
      setCustomColor,
      setSemanticColor,
      setLayout,
      setContentWidth,
      setSidebarDefault,
      setStickyHeader,
      setWatermarkVisible,
      setBreadcrumbVisible,
      setBreadcrumbIcon,
      setTabsVisible,
      setTabStyle,
      setFooterVisible,
      setPageTransition,
      applyPreset,
      reset,
    }
  },
  {
    persist: appearancePersistence,
  },
)

if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useAppearanceStore, import.meta.hot))
