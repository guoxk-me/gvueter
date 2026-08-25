import type { ResolvedTheme, ThemeMode } from '@/stores/appearance'
import { storeToRefs } from 'pinia'
import { computed, shallowRef } from 'vue'
import { useThemeColor } from '@/composables/useThemeColor'
import { THEME_MODES, useAppearanceStore } from '@/stores/appearance'

export { THEME_MODES } from '@/stores/appearance'
export type { ResolvedTheme, ThemeMode } from '@/stores/appearance'

const systemPrefersDark = shallowRef(false)
let isSystemPreferenceObserved = false

function observeSystemPreference(): void {
  if (
    isSystemPreferenceObserved
    || typeof window === 'undefined'
    || typeof window.matchMedia !== 'function'
  ) {
    return
  }

  const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
  systemPrefersDark.value = colorSchemeQuery.matches
  colorSchemeQuery.addEventListener?.('change', (event) => {
    systemPrefersDark.value = event.matches
  })
  isSystemPreferenceObserved = true
}

export function useTheme() {
  const appearance = useAppearanceStore()
  const { themeMode } = storeToRefs(appearance)

  // AI modified: legacy theme controls now project the single AppSettings source into the DOM.
  useThemeColor()
  observeSystemPreference()

  const resolvedTheme = computed<ResolvedTheme>(() => {
    if (themeMode.value !== 'system')
      return themeMode.value
    return systemPrefersDark.value ? 'dark' : 'light'
  })
  const isDark = computed(() => resolvedTheme.value === 'dark')

  function setTheme(mode: ThemeMode, event?: MouseEvent): void {
    void event

    const apply = (): void => appearance.setThemeMode(mode)
    if (typeof document === 'undefined' || !document.startViewTransition) {
      apply()
      return
    }

    document.startViewTransition(apply)
  }

  function cycleTheme(event?: MouseEvent): void {
    const currentIndex = THEME_MODES.indexOf(themeMode.value)
    const nextMode = THEME_MODES[(currentIndex + 1) % THEME_MODES.length] ?? 'system'
    setTheme(nextMode, event)
  }

  function toggleTheme(event?: MouseEvent): void {
    cycleTheme(event)
  }

  return {
    themeMode,
    resolvedTheme,
    isDark,
    setTheme,
    cycleTheme,
    toggleTheme,
  }
}
