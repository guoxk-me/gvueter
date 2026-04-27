/**
 * 主题色预设
 * 每个预设提供 light / dark 两套 oklch CSS 变量覆盖值
 * 受影响的变量：
 *   --primary, --primary-foreground
 *   --ring
 *   --accent-foreground
 *   --sidebar-primary, --sidebar-primary-foreground
 *   --sidebar-accent-foreground
 *   --chart-1
 */

export interface ThemeColorVars {
  primary: string
  primaryForeground: string
  ring: string
  accentForeground: string
  sidebarPrimary: string
  sidebarPrimaryForeground: string
  sidebarAccentForeground: string
  chart1: string
}

export interface ThemePreset {
  id: ThemeColorId
  labelZh: string
  labelEn: string
  /** 用于颜色预览的 CSS 色值（swatch） */
  swatch: string
  light: ThemeColorVars
  dark: ThemeColorVars
}

export const THEME_COLOR_IDS = [
  'violet',
  'blue',
  'cyan',
  'green',
  'orange',
  'rose',
  'slate',
  'custom',
] as const

export type ThemeColorId = (typeof THEME_COLOR_IDS)[number]

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'violet',
    labelZh: '紫罗兰',
    labelEn: 'Violet',
    swatch: 'oklch(0.646 0.222 293.541)',
    light: {
      primary: 'oklch(0.21 0.006 285.885)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.646 0.222 293.541)',
      accentForeground: 'oklch(70.2% 0.183 293.541)',
      sidebarPrimary: 'oklch(0.646 0.222 293.541)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarAccentForeground: 'oklch(70.2% 0.183 293.541)',
      chart1: 'oklch(0.646 0.222 293.541)',
    },
    dark: {
      primary: 'oklch(0.985 0 0)',
      primaryForeground: 'oklch(0.21 0.006 285.885)',
      ring: 'oklch(0.442 0.017 285.786)',
      accentForeground: 'oklch(70.2% 0.183 293.541)',
      sidebarPrimary: 'oklch(70.2% 0.183 293.541)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarAccentForeground: 'oklch(70.2% 0.183 293.541)',
      chart1: 'oklch(0.488 0.243 293.541)',
    },
  },
  {
    id: 'blue',
    labelZh: '蓝色',
    labelEn: 'Blue',
    swatch: 'oklch(0.623 0.214 255.532)',
    light: {
      primary: 'oklch(0.45 0.18 255)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.623 0.214 255.532)',
      accentForeground: 'oklch(0.623 0.214 255.532)',
      sidebarPrimary: 'oklch(0.623 0.214 255.532)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarAccentForeground: 'oklch(0.623 0.214 255.532)',
      chart1: 'oklch(0.623 0.214 255.532)',
    },
    dark: {
      primary: 'oklch(0.985 0 0)',
      primaryForeground: 'oklch(0.45 0.18 255)',
      ring: 'oklch(0.45 0.12 255)',
      accentForeground: 'oklch(0.72 0.18 255)',
      sidebarPrimary: 'oklch(0.72 0.18 255)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarAccentForeground: 'oklch(0.72 0.18 255)',
      chart1: 'oklch(0.546 0.245 255.532)',
    },
  },
  {
    id: 'cyan',
    labelZh: '青色',
    labelEn: 'Cyan',
    swatch: 'oklch(0.65 0.18 200)',
    light: {
      primary: 'oklch(0.4 0.15 200)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.65 0.18 200)',
      accentForeground: 'oklch(0.65 0.18 200)',
      sidebarPrimary: 'oklch(0.65 0.18 200)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarAccentForeground: 'oklch(0.65 0.18 200)',
      chart1: 'oklch(0.65 0.18 200)',
    },
    dark: {
      primary: 'oklch(0.985 0 0)',
      primaryForeground: 'oklch(0.4 0.15 200)',
      ring: 'oklch(0.45 0.1 200)',
      accentForeground: 'oklch(0.72 0.16 200)',
      sidebarPrimary: 'oklch(0.72 0.16 200)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarAccentForeground: 'oklch(0.72 0.16 200)',
      chart1: 'oklch(0.56 0.2 200)',
    },
  },
  {
    id: 'green',
    labelZh: '绿色',
    labelEn: 'Green',
    swatch: 'oklch(0.627 0.194 149.214)',
    light: {
      primary: 'oklch(0.4 0.15 149)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.627 0.194 149.214)',
      accentForeground: 'oklch(0.627 0.194 149)',
      sidebarPrimary: 'oklch(0.627 0.194 149.214)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarAccentForeground: 'oklch(0.627 0.194 149)',
      chart1: 'oklch(0.627 0.194 149.214)',
    },
    dark: {
      primary: 'oklch(0.985 0 0)',
      primaryForeground: 'oklch(0.4 0.15 149)',
      ring: 'oklch(0.45 0.1 149)',
      accentForeground: 'oklch(0.72 0.17 149)',
      sidebarPrimary: 'oklch(0.72 0.17 149)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarAccentForeground: 'oklch(0.72 0.17 149)',
      chart1: 'oklch(0.527 0.177 149.214)',
    },
  },
  {
    id: 'orange',
    labelZh: '橙色',
    labelEn: 'Orange',
    swatch: 'oklch(0.702 0.191 47.604)',
    light: {
      primary: 'oklch(0.5 0.18 47)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.702 0.191 47.604)',
      accentForeground: 'oklch(0.702 0.191 47)',
      sidebarPrimary: 'oklch(0.702 0.191 47.604)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarAccentForeground: 'oklch(0.702 0.191 47)',
      chart1: 'oklch(0.702 0.191 47.604)',
    },
    dark: {
      primary: 'oklch(0.985 0 0)',
      primaryForeground: 'oklch(0.5 0.18 47)',
      ring: 'oklch(0.5 0.12 47)',
      accentForeground: 'oklch(0.76 0.17 47)',
      sidebarPrimary: 'oklch(0.76 0.17 47)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarAccentForeground: 'oklch(0.76 0.17 47)',
      chart1: 'oklch(0.621 0.191 47.604)',
    },
  },
  {
    id: 'rose',
    labelZh: '玫瑰红',
    labelEn: 'Rose',
    swatch: 'oklch(0.645 0.246 16)',
    light: {
      primary: 'oklch(0.45 0.2 16)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.645 0.246 16)',
      accentForeground: 'oklch(0.645 0.246 16)',
      sidebarPrimary: 'oklch(0.645 0.246 16)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarAccentForeground: 'oklch(0.645 0.246 16)',
      chart1: 'oklch(0.645 0.246 16)',
    },
    dark: {
      primary: 'oklch(0.985 0 0)',
      primaryForeground: 'oklch(0.45 0.2 16)',
      ring: 'oklch(0.45 0.12 16)',
      accentForeground: 'oklch(0.72 0.22 16)',
      sidebarPrimary: 'oklch(0.72 0.22 16)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarAccentForeground: 'oklch(0.72 0.22 16)',
      chart1: 'oklch(0.56 0.28 16)',
    },
  },
  {
    id: 'slate',
    labelZh: '石板灰',
    labelEn: 'Slate',
    swatch: 'oklch(0.55 0.02 250)',
    light: {
      primary: 'oklch(0.3 0.015 250)',
      primaryForeground: 'oklch(0.985 0 0)',
      ring: 'oklch(0.55 0.02 250)',
      accentForeground: 'oklch(0.55 0.02 250)',
      sidebarPrimary: 'oklch(0.55 0.02 250)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarAccentForeground: 'oklch(0.55 0.02 250)',
      chart1: 'oklch(0.55 0.02 250)',
    },
    dark: {
      primary: 'oklch(0.985 0 0)',
      primaryForeground: 'oklch(0.3 0.015 250)',
      ring: 'oklch(0.45 0.015 250)',
      accentForeground: 'oklch(0.7 0.02 250)',
      sidebarPrimary: 'oklch(0.7 0.02 250)',
      sidebarPrimaryForeground: 'oklch(0.985 0 0)',
      sidebarAccentForeground: 'oklch(0.7 0.02 250)',
      chart1: 'oklch(0.55 0.02 250)',
    },
  },
]

/** 根据 id 获取预设（不含 custom） */
export function getPreset(id: ThemeColorId): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id)
}
