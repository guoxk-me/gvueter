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

  function toggleTheme() {
    colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark'
  }

  const isDark = computed(() => colorMode.value === 'dark')

  return {
    colorMode,
    isDark,
    toggleTheme,
  }
}
