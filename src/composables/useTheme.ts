import { computed } from 'vue'
import { useColorMode } from '@vueuse/core'

export function useTheme() {
  const colorMode = useColorMode({
    attribute: 'class',
    modes: {
      light: 'light',
      dark: 'dark',
    },
  })

  /**
   * Toggle between light and dark mode.
   * Accepts an optional MouseEvent to animate the transition from the click origin
   * using the View Transitions API. Falls back gracefully in unsupported browsers.
   */
  function toggleTheme(event?: MouseEvent) {
    const x = event ? `${event.clientX}px` : '50%'
    const y = event ? `${event.clientY}px` : '50%'
    document.documentElement.style.setProperty('--theme-x', x)
    document.documentElement.style.setProperty('--theme-y', y)

    const apply = () => {
      colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark'
    }

    // Graceful degradation: Firefox and other browsers without View Transitions
    if (!document.startViewTransition) {
      apply()
      return
    }

    document.startViewTransition(apply)
  }

  const isDark = computed(() => colorMode.value === 'dark')

  return {
    colorMode,
    isDark,
    toggleTheme,
  }
}
