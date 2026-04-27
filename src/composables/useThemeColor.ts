import { watch } from 'vue'
import { useAppearanceStore } from '@/stores/appearance'
import { type ThemeColorId, getPreset } from '@/lib/theme-presets'
import { useTheme } from '@/composables/useTheme'

/**
 * 将主题色应用为 inline CSS 变量（覆盖 main.css 默认值）
 * 支持 light / dark 两套，跟随当前 resolvedTheme 自动切换
 */

/** 将 hex 色转换为近似 oklch 字符串（简单映射，仅用于 custom 色） */
function hexToOklch(hex: string): string {
  // 简单地把 hex 转 rgb 再近似到 oklch 的 l/c/h
  // 对于自定义色，我们直接输出 hex（现代浏览器支持在 oklch 场景使用 hex）
  return hex
}

function applyVars(vars: Record<string, string>) {
  const root = document.documentElement
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}

function clearVars(keys: string[]) {
  const root = document.documentElement
  for (const key of keys) {
    root.style.removeProperty(key)
  }
}

const VAR_KEYS = [
  '--primary',
  '--primary-foreground',
  '--ring',
  '--accent-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent-foreground',
  '--chart-1',
]

function buildCustomVars(hex: string, isDark: boolean): Record<string, string> {
  const color = hexToOklch(hex)
  if (isDark) {
    return {
      '--primary': 'oklch(0.985 0 0)',
      '--primary-foreground': color,
      '--ring': color,
      '--accent-foreground': color,
      '--sidebar-primary': color,
      '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
      '--sidebar-accent-foreground': color,
      '--chart-1': color,
    }
  }
  return {
    '--primary': color,
    '--primary-foreground': 'oklch(0.985 0 0)',
    '--ring': color,
    '--accent-foreground': color,
    '--sidebar-primary': color,
    '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
    '--sidebar-accent-foreground': color,
    '--chart-1': color,
  }
}

function applyThemeColor(colorId: ThemeColorId, customColor: string, isDark: boolean) {
  if (typeof document === 'undefined') return

  if (colorId === 'violet') {
    // 默认色：移除 inline 覆盖，让 CSS 文件生效
    clearVars(VAR_KEYS)
    return
  }

  if (colorId === 'custom') {
    applyVars(buildCustomVars(customColor, isDark))
    return
  }

  const preset = getPreset(colorId)
  if (!preset) return

  const vars = isDark ? preset.dark : preset.light
  applyVars({
    '--primary': vars.primary,
    '--primary-foreground': vars.primaryForeground,
    '--ring': vars.ring,
    '--accent-foreground': vars.accentForeground,
    '--sidebar-primary': vars.sidebarPrimary,
    '--sidebar-primary-foreground': vars.sidebarPrimaryForeground,
    '--sidebar-accent-foreground': vars.sidebarAccentForeground,
    '--chart-1': vars.chart1,
  })
}

let initialized = false

export function useThemeColor() {
  const appearance = useAppearanceStore()
  const { resolvedTheme } = useTheme()

  if (!initialized) {
    initialized = true
    // 立即应用
    applyThemeColor(appearance.themeColor, appearance.customColor, resolvedTheme.value === 'dark')

    // 监听 themeColor / customColor / resolvedTheme 变化
    watch(
      [() => appearance.themeColor, () => appearance.customColor, resolvedTheme],
      ([colorId, customColor, theme]) => {
        applyThemeColor(colorId as ThemeColorId, customColor, theme === 'dark')
      },
    )
  }

  return { applyThemeColor }
}

/**
 * 在 main.ts 中调用，无需 Pinia，仅读取 localStorage 快速应用
 * 避免首屏闪烁（FOUC）
 */
export function hydrateThemeColorEarly() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem('appearance')
    if (!raw) return
    const stored = JSON.parse(raw) as { themeColor?: string; customColor?: string }
    const colorId = stored.themeColor as ThemeColorId | undefined
    const customColor = stored.customColor ?? '#8b5cf6'
    if (!colorId || colorId === 'violet') return

    const isDark =
      document.documentElement.classList.contains('dark') ||
      (localStorage.getItem('theme') === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)

    if (colorId === 'custom') {
      applyVars(buildCustomVars(customColor, isDark))
      return
    }

    // 动态导入（同步 ESM 静态 import 的方式在 early 阶段不可用，直接内联逻辑）
    void import('@/lib/theme-presets').then(({ THEME_PRESETS }) => {
      const preset = THEME_PRESETS.find((p) => p.id === colorId)
      if (!preset) return
      const vars = isDark ? preset.dark : preset.light
      applyVars({
        '--primary': vars.primary,
        '--primary-foreground': vars.primaryForeground,
        '--ring': vars.ring,
        '--accent-foreground': vars.accentForeground,
        '--sidebar-primary': vars.sidebarPrimary,
        '--sidebar-primary-foreground': vars.sidebarPrimaryForeground,
        '--sidebar-accent-foreground': vars.sidebarAccentForeground,
        '--chart-1': vars.chart1,
      })
    })
  } catch {
    // ignore
  }
}
