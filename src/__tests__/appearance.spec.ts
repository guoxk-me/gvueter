import type { Composer } from 'vue-i18n'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, nextTick } from 'vue'
import AppearancePanel from '@/components/layout/AppearancePanel.vue'
import { getAdminLayoutDefinition } from '@/components/layout/layout-contract'
import { startAppLocaleSync } from '@/composables/useLocaleToggle'
import { useTheme } from '@/composables/useTheme'
import { hydrateThemeColorEarly, useThemeColor } from '@/composables/useThemeColor'
import { i18n, setLocale } from '@/i18n'
import { getThemeCssVariables } from '@/lib/theme-presets'
import { DEFAULT_APP_SETTINGS, LAYOUT_MODES, useAppearanceStore } from '@/stores/appearance'

let isSystemDark = false
let isReducedMotion = false

function installAppearancePinia() {
  const pinia = createPinia().use(piniaPluginPersistedstate)
  createApp({}).use(pinia)
  setActivePinia(pinia)
  return useAppearanceStore()
}

function clearDocumentSettings(): void {
  const root = document.documentElement
  root.className = ''
  root.removeAttribute('style')
  root.lang = ''
  for (const attribute of root.getAttributeNames()) {
    if (attribute.startsWith('data-')) root.removeAttribute(attribute)
  }
}

beforeEach(() => {
  localStorage.clear()
  clearDocumentSettings()
  isSystemDark = false
  isReducedMotion = false

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(
      (media: string) =>
        ({
          // AI modified: color-scheme fixtures cannot accidentally opt Motion into reduced mode.
          matches: media.includes('prefers-reduced-motion')
            ? isReducedMotion
            : media.includes('prefers-color-scheme')
              ? isSystemDark
              : false,
          media,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(() => true),
        }) as unknown as MediaQueryList,
    ),
  })
})

describe('useAppearanceStore', () => {
  it('exposes one complete settings contract and restores all defaults', () => {
    const appearance = installAppearancePinia()

    expect(appearance.settings).toEqual(DEFAULT_APP_SETTINGS)

    appearance.setThemeMode('dark')
    appearance.setLocale('en-US')
    appearance.setComponentSize('lg')
    appearance.setLayout('header-hybrid-sidebar-first')
    appearance.setSidebarDefault('collapsed')
    appearance.setStickyHeader(false)
    appearance.setWatermarkVisible(true)
    appearance.setBreadcrumbVisible(false)
    appearance.setTabsVisible(false)
    appearance.setFooterVisible(false)
    appearance.setPageTransition('none')
    appearance.reset()

    expect(appearance.settings).toEqual(DEFAULT_APP_SETTINGS)
    expect(appearance.stickyHeader).toBe(true)
  })

  it('migrates legacy fields and rejects unsafe persisted values', () => {
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('locale', 'en-US')
    localStorage.setItem(
      'appearance',
      JSON.stringify({
        themeColor: 'blue',
        layout: 'mixed',
        stickyHeader: false,
        componentSize: 'huge',
        successColor: 'url(javascript:alert(1))',
      }),
    )

    const appearance = installAppearancePinia()

    expect(appearance.themeColor).toBe('blue')
    expect(appearance.layout).toBe('mixed')
    expect(appearance.isHeaderSticky).toBe(false)
    expect(appearance.componentSize).toBe('default')
    expect(appearance.successColor).toBe(DEFAULT_APP_SETTINGS.successColor)
    expect(appearance.themeMode).toBe('dark')
    expect(appearance.locale).toBe('en-US')
  })

  it('keeps modern theme and locale settings authoritative over migrated legacy keys', () => {
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('locale', 'en-US')
    localStorage.setItem(
      'appearance',
      JSON.stringify({
        themeMode: 'light',
        locale: 'zh-CN',
      }),
    )

    const appearance = installAppearancePinia()

    // AI modified: stale compatibility keys cannot roll back a newer appearance selection.
    expect(appearance.themeMode).toBe('light')
    expect(appearance.locale).toBe('zh-CN')
  })

  it('applies and persists layout, theme, density, and interface presets together', async () => {
    const appearance = installAppearancePinia()

    appearance.applyPreset('midnight')
    await nextTick()

    expect(appearance.settings).toMatchObject({
      themeMode: 'dark',
      componentSize: 'md',
      layout: 'header-hybrid-header-first',
      themeColor: 'cyan',
      sidebarDefault: 'collapsed',
      isWatermarkVisible: true,
      isFooterVisible: false,
      pageTransition: 'fade',
    })

    const persistedSettings = JSON.parse(localStorage.getItem('appearance') ?? '{}') as Record<
      string,
      unknown
    >
    expect(persistedSettings).toMatchObject({
      themeMode: 'dark',
      componentSize: 'md',
      layout: 'header-hybrid-header-first',
      isWatermarkVisible: true,
    })

    const restoredAppearance = installAppearancePinia()
    expect(restoredAppearance.settings).toEqual(appearance.settings)
  })
})

describe('appearance document projection', () => {
  it('updates html state, semantic colors, and the complete chart palette', () => {
    const appearance = installAppearancePinia()
    useThemeColor()

    appearance.setThemeMode('dark')
    appearance.setLocale('en-US')
    appearance.setComponentSize('lg')
    appearance.setLayout('sidebar-hybrid-header-first')
    appearance.setSidebarDefault('collapsed')
    appearance.setWatermarkVisible(true)
    appearance.setThemeColor('blue')
    appearance.setSemanticColor('success', '#22c55e')
    appearance.setSemanticColor('warning', '#f59e0b')
    appearance.setSemanticColor('destructive', '#f43f5e')

    const root = document.documentElement
    const expectedColors = getThemeCssVariables(
      'blue',
      DEFAULT_APP_SETTINGS.customColor,
      { success: '#22c55e', warning: '#f59e0b', destructive: '#f43f5e' },
      true,
    )
    expect(root.classList.contains('dark')).toBe(true)
    expect(root.classList.contains('is-sidebar-collapsed')).toBe(true)
    expect(root.classList.contains('has-watermark')).toBe(true)
    expect(root.lang).toBe('en-US')
    expect(root.dataset).toMatchObject({
      theme: 'dark',
      themeMode: 'dark',
      componentSize: 'lg',
      layout: 'sidebar-hybrid-header-first',
      sidebar: 'collapsed',
      watermark: 'true',
    })
    // AI modified: document projection preserves the contrast-safe runtime semantic palette.
    expect(root.style.getPropertyValue('--success')).toBe(expectedColors['--success'])
    expect(root.style.getPropertyValue('--success-foreground')).toBe(
      expectedColors['--success-foreground'],
    )
    expect(root.style.getPropertyValue('--warning')).toBe(expectedColors['--warning'])
    expect(root.style.getPropertyValue('--destructive')).toBe(expectedColors['--destructive'])
    expect(root.style.getPropertyValue('--chart-1')).not.toBe('')
    expect(root.style.getPropertyValue('--chart-2')).toBe(root.style.getPropertyValue('--success'))
    expect(root.style.getPropertyValue('--chart-3')).toBe(root.style.getPropertyValue('--warning'))
    expect(root.style.getPropertyValue('--chart-4')).toBe(
      root.style.getPropertyValue('--destructive'),
    )
    expect(root.style.getPropertyValue('--chart-5')).toContain('color-mix')
  })

  it('resolves system theme before applying color tokens', () => {
    isSystemDark = true
    const appearance = installAppearancePinia()
    useThemeColor()

    appearance.setThemeMode('system')

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})

describe('AppSettings startup adapters', () => {
  it('starts and keeps in-memory appearance state when Web Storage throws', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError')
    })
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage quota exceeded', 'QuotaExceededError')
    })

    try {
      expect(() => hydrateThemeColorEarly()).not.toThrow()
      const appearance = installAppearancePinia()
      expect(() => useThemeColor()).not.toThrow()
      expect(() => appearance.setThemeMode('dark')).not.toThrow()
      // AI modified: storage failure cannot prevent the current document from receiving user settings.
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    } finally {
      getItemSpy.mockRestore()
      setItemSpy.mockRestore()
    }
  })

  it('keeps the legacy theme and locale APIs projected from AppSettings', () => {
    const appearance = installAppearancePinia()
    const { setTheme, themeMode } = useTheme()
    const composer = i18n.global as unknown as Composer
    startAppLocaleSync(appearance)

    setTheme('dark')
    expect(appearance.themeMode).toBe('dark')
    expect(themeMode.value).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    appearance.setThemeMode('light')
    appearance.setLocale('en-US')
    expect(themeMode.value).toBe('light')
    expect(composer.locale.value).toBe('en-US')
    expect(document.documentElement.lang).toBe('en-US')
  })
})

describe('AppearancePanel layout contract', () => {
  it('renders every preview from the Shell grid and hides inapplicable breadcrumb icon settings', async () => {
    setLocale('en-US')
    const pinia = createPinia()
    const appearance = useAppearanceStore(pinia)
    const wrapper = mount(AppearancePanel, {
      attachTo: document.body,
      props: { open: true },
      global: { plugins: [pinia, i18n] },
    })
    await nextTick()

    for (const layoutMode of LAYOUT_MODES) {
      const definition = getAdminLayoutDefinition(layoutMode)
      const preview = document.body.querySelector<HTMLElement>(
        `[data-preview-layout="${layoutMode}"]`,
      )
      expect(preview?.style.gridTemplateAreas).toBe(definition.gridTemplateAreas)
      expect(preview?.style.gridTemplateColumns).toBe(definition.previewGridTemplateColumns)
      expect(preview?.style.gridTemplateRows).toBe(definition.previewGridTemplateRows)
      expect(Boolean(preview?.querySelector('.layout-preview__primary-sidebar'))).toBe(
        definition.primaryNavigation !== 'header',
      )
      expect(Boolean(preview?.querySelector('.layout-preview__secondary-sidebar'))).toBe(
        definition.secondaryNavigation !== 'none',
      )
    }

    expect(document.body.textContent).toContain('Breadcrumb Icons')
    // AI modified: controls with no observable effect are removed with their parent setting.
    appearance.setBreadcrumbVisible(false)
    await nextTick()
    expect(document.body.textContent).not.toContain('Breadcrumb Icons')
    wrapper.unmount()
  })
})
