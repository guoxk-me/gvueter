import type { EffectScope } from 'vue'
import type { AppSettings, ResolvedTheme } from '@/stores/appearance'
import { effectScope, onScopeDispose, watch } from 'vue'
import { getBrowserStorage, safeStorageSet } from '@/lib/browser-storage'
import { getThemeCssVariables } from '@/lib/theme-presets'
import { readStoredAppSettings, resolveThemeMode, useAppearanceStore } from '@/stores/appearance'

function applyCssVariables(variables: Record<string, string>): void {
  const root = document.documentElement
  for (const [property, color] of Object.entries(variables)) root.style.setProperty(property, color)
}

function syncLegacyPreferences(settings: AppSettings): void {
  // AI modified: keep legacy theme/locale consumers synchronized while AppSettings becomes the source of truth.
  const storage = getBrowserStorage('local')
  safeStorageSet(storage, 'theme', settings.themeMode)
  safeStorageSet(storage, 'locale', settings.locale)
}

export function applyAppSettingsToDocument(
  settings: AppSettings,
  resolvedTheme: ResolvedTheme = resolveThemeMode(settings.themeMode),
): void {
  if (typeof document === 'undefined')
    return

  const root = document.documentElement
  const isDark = resolvedTheme === 'dark'

  root.classList.toggle('dark', isDark)
  root.classList.toggle('is-sidebar-collapsed', settings.sidebarDefault === 'collapsed')
  root.classList.toggle('has-watermark', settings.isWatermarkVisible)
  root.classList.toggle('has-tabs', settings.isTabsVisible)
  root.style.colorScheme = resolvedTheme
  root.lang = settings.locale

  root.dataset.theme = resolvedTheme
  root.dataset.themeMode = settings.themeMode
  root.dataset.locale = settings.locale
  root.dataset.componentSize = settings.componentSize
  root.dataset.layout = settings.layout
  root.dataset.contentWidth = settings.contentWidth
  root.dataset.sidebar = settings.sidebarDefault
  root.dataset.stickyHeader = String(settings.isHeaderSticky)
  root.dataset.watermark = String(settings.isWatermarkVisible)
  root.dataset.breadcrumb = String(settings.isBreadcrumbVisible)
  root.dataset.breadcrumbIcon = String(settings.hasBreadcrumbIcon)
  root.dataset.tabs = String(settings.isTabsVisible)
  root.dataset.tabStyle = settings.tabStyle
  root.dataset.footer = String(settings.isFooterVisible)
  root.dataset.pageTransition = settings.pageTransition

  applyCssVariables(
    getThemeCssVariables(
      settings.themeColor,
      settings.customColor,
      {
        success: settings.successColor,
        warning: settings.warningColor,
        destructive: settings.destructiveColor,
      },
      isDark,
    ),
  )
  syncLegacyPreferences(settings)
}

type AppearanceStore = ReturnType<typeof useAppearanceStore>

let activeAppearanceStore: AppearanceStore | undefined
let settingsEffectScope: EffectScope | undefined

function startSettingsSync(appearance: AppearanceStore): void {
  if (activeAppearanceStore === appearance && settingsEffectScope?.active)
    return

  settingsEffectScope?.stop()
  activeAppearanceStore = appearance
  settingsEffectScope = effectScope(true)

  settingsEffectScope.run(() => {
    watch(
      () => appearance.settings,
      settings => applyAppSettingsToDocument(settings),
      { immediate: true, flush: 'sync' },
    )

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function')
      return

    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleColorSchemeChange = (): void => {
      if (appearance.themeMode === 'system')
        applyAppSettingsToDocument(appearance.settings, colorSchemeQuery.matches ? 'dark' : 'light')
    }

    colorSchemeQuery.addEventListener?.('change', handleColorSchemeChange)
    onScopeDispose(() => colorSchemeQuery.removeEventListener?.('change', handleColorSchemeChange))
  })
}

export function useThemeColor() {
  const appearance = useAppearanceStore()
  startSettingsSync(appearance)

  return {
    applyThemeColor: () => applyAppSettingsToDocument(appearance.settings),
  }
}

/**
 * Applies persisted settings before Vue mounts to avoid theme, density, and layout flashes.
 */
export function hydrateThemeColorEarly(): void {
  if (typeof window === 'undefined')
    return
  applyAppSettingsToDocument(readStoredAppSettings())
}
