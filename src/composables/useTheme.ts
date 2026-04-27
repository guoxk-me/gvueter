import { computed, ref } from 'vue'

export const THEME_MODES = ['system', 'light', 'dark'] as const

export type ThemeMode = (typeof THEME_MODES)[number]
export type ResolvedTheme = Exclude<ThemeMode, 'system'>

const THEME_STORAGE_KEY = 'theme'
const themeMode = ref<ThemeMode>('system')
const systemPrefersDark = ref(false)

let isInitialized = false

function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && THEME_MODES.includes(value as ThemeMode)
}

function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemeMode(storedTheme) ? storedTheme : 'system'
}

function getMediaQuery() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.matchMedia('(prefers-color-scheme: dark)')
}

function getResolvedTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') {
    return systemPrefersDark.value ? 'dark' : 'light'
  }

  return mode
}

function applyResolvedTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') {
    return
  }

  const resolvedTheme = getResolvedTheme(mode)
  document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
  document.documentElement.style.colorScheme = resolvedTheme
}

function initializeTheme() {
  if (isInitialized || typeof window === 'undefined') {
    return
  }

  const mediaQuery = getMediaQuery()
  systemPrefersDark.value = mediaQuery?.matches ?? false
  themeMode.value = getStoredThemeMode()
  applyResolvedTheme(themeMode.value)

  const handlePreferenceChange = (event: MediaQueryListEvent) => {
    systemPrefersDark.value = event.matches

    if (themeMode.value === 'system') {
      applyResolvedTheme('system')
    }
  }

  mediaQuery?.addEventListener('change', handlePreferenceChange)
  isInitialized = true
}

function setTransitionOrigin(event?: MouseEvent) {
  if (typeof document === 'undefined') {
    return
  }

  const x = event ? `${event.clientX}px` : '50%'
  const y = event ? `${event.clientY}px` : '50%'

  document.documentElement.style.setProperty('--theme-x', x)
  document.documentElement.style.setProperty('--theme-y', y)
}

export function useTheme() {
  initializeTheme()

  const resolvedTheme = computed<ResolvedTheme>(() => getResolvedTheme(themeMode.value))
  const isDark = computed(() => resolvedTheme.value === 'dark')

  function setTheme(mode: ThemeMode, event?: MouseEvent) {
    setTransitionOrigin(event)

    const apply = () => {
      themeMode.value = mode
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_STORAGE_KEY, mode)
      }
      applyResolvedTheme(mode)
    }

    if (typeof document === 'undefined' || !document.startViewTransition) {
      apply()
      return
    }

    document.startViewTransition(apply)
  }

  function cycleTheme(event?: MouseEvent) {
    const currentIndex = THEME_MODES.indexOf(themeMode.value)
    const nextMode = THEME_MODES[(currentIndex + 1) % THEME_MODES.length] ?? 'system'
    setTheme(nextMode, event)
  }

  function toggleTheme(event?: MouseEvent) {
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
