export interface ThemeColorVars {
  primary: string
  primaryForeground: string
  primaryText: string
  ring: string
  accentForeground: string
  sidebarPrimary: string
  sidebarPrimaryForeground: string
  sidebarAccentForeground: string
  chart1: string
}

export interface ThemePreset {
  id: Exclude<ThemeColorId, 'custom'>
  labelZh: string
  labelEn: string
  swatch: string
  light: ThemeColorVars
  dark: ThemeColorVars
}

export interface SemanticThemeColors {
  success: string
  warning: string
  destructive: string
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

interface ThemePaletteDefinition {
  id: Exclude<ThemeColorId, 'custom'>
  labelZh: string
  labelEn: string
  lightPrimary: string
  darkPrimary: string
}

const paletteDefinitions: readonly ThemePaletteDefinition[] = [
  {
    id: 'violet',
    labelZh: '紫罗兰',
    labelEn: 'Violet',
    lightPrimary: 'oklch(0.541 0.281 293.009)',
    darkPrimary: 'oklch(0.702 0.183 293.541)',
  },
  {
    id: 'blue',
    labelZh: '蓝色',
    labelEn: 'Blue',
    lightPrimary: 'oklch(0.546 0.245 262.881)',
    darkPrimary: 'oklch(0.707 0.165 254.624)',
  },
  {
    id: 'cyan',
    labelZh: '青色',
    labelEn: 'Cyan',
    lightPrimary: 'oklch(0.609 0.126 221.723)',
    darkPrimary: 'oklch(0.789 0.154 211.53)',
  },
  {
    id: 'green',
    labelZh: '绿色',
    labelEn: 'Green',
    lightPrimary: 'oklch(0.527 0.154 150.069)',
    darkPrimary: 'oklch(0.792 0.209 151.711)',
  },
  {
    id: 'orange',
    labelZh: '橙色',
    labelEn: 'Orange',
    lightPrimary: 'oklch(0.646 0.222 41.116)',
    darkPrimary: 'oklch(0.75 0.183 55.934)',
  },
  {
    id: 'rose',
    labelZh: '玫瑰红',
    labelEn: 'Rose',
    lightPrimary: 'oklch(0.586 0.253 17.585)',
    darkPrimary: 'oklch(0.712 0.194 13.428)',
  },
  {
    id: 'slate',
    labelZh: '石板灰',
    labelEn: 'Slate',
    lightPrimary: 'oklch(0.446 0.043 257.281)',
    darkPrimary: 'oklch(0.704 0.04 256.788)',
  },
]

// AI modified: runtime text contrast must use the actual Quiet Layers page surfaces.
const LIGHT_PAGE_SURFACE = 'oklch(0.978 0.008 293)'
const DARK_PAGE_SURFACE = 'oklch(0.18 0.009 65)'

function themeColorVars(primary: string, isDark: boolean): ThemeColorVars {
  const foreground = getReadableForeground(primary)
  const pageSurface = isDark ? DARK_PAGE_SURFACE : LIGHT_PAGE_SURFACE
  // AI modified: a conservative page-surface threshold accounts for the brand tint behind active text.
  const accentForeground = getReadableOnSurfaceColor(primary, pageSurface, 5)

  return {
    primary,
    primaryForeground: foreground,
    primaryText: getReadableOnSurfaceColor(primary, pageSurface, 4.5),
    ring: getReadableOnSurfaceColor(primary, pageSurface, 3),
    // AI modified: bright runtime palettes fall back to readable text on subtle accent surfaces.
    accentForeground,
    sidebarPrimary: primary,
    sidebarPrimaryForeground: foreground,
    sidebarAccentForeground: accentForeground,
    chart1: primary,
  }
}

// AI modified: derive every preset from one Tailwind-aligned palette definition so light/dark tokens cannot drift.
export const THEME_PRESETS: readonly ThemePreset[] = paletteDefinitions.map(palette => ({
  id: palette.id,
  labelZh: palette.labelZh,
  labelEn: palette.labelEn,
  swatch: palette.lightPrimary,
  light: themeColorVars(palette.lightPrimary, false),
  dark: themeColorVars(palette.darkPrimary, true),
}))

export function getPreset(id: ThemeColorId): ThemePreset | undefined {
  return THEME_PRESETS.find(preset => preset.id === id)
}

function customThemeColorVars(customColor: string, isDark: boolean): ThemeColorVars {
  // AI modified: a concrete dark tone keeps runtime contrast measurable instead of hiding it in color-mix().
  const primary = semanticTone(customColor, isDark)
  return themeColorVars(primary, isDark)
}

function semanticTone(color: string, isDark: boolean): string {
  if (!isDark)
    return color
  const channels = [1, 3, 5].map(startIndex =>
    Math.round(Number.parseInt(color.slice(startIndex, startIndex + 2), 16) * 0.82 + 255 * 0.18),
  )
  return `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`
}

function getHexRelativeLuminance(color: string): number {
  const channels = [1, 3, 5].map((startIndex) => {
    const channel = Number.parseInt(color.slice(startIndex, startIndex + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

function getOklchRelativeLuminance(color: string): number {
  const match = color.match(/^oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+(-?[\d.]+)(?:deg)?\s*\)$/i)
  if (!match?.[1] || !match[3] || !match[4])
    throw new Error(`Unsupported runtime theme color: ${color}`)

  const lightness = Number.parseFloat(match[1]) / (match[2] ? 100 : 1)
  const chroma = Number.parseFloat(match[3])
  const hueRadians = (Number.parseFloat(match[4]) * Math.PI) / 180
  const labA = chroma * Math.cos(hueRadians)
  const labB = chroma * Math.sin(hueRadians)
  const lightnessRoot = lightness + 0.3963377774 * labA + 0.2158037573 * labB
  const mediumRoot = lightness - 0.1055613458 * labA - 0.0638541728 * labB
  const shortRoot = lightness - 0.0894841775 * labA - 1.291485548 * labB
  const linearLightness = lightnessRoot ** 3
  const linearMedium = mediumRoot ** 3
  const linearShort = shortRoot ** 3
  const clampChannel = (channel: number): number => Math.min(1, Math.max(0, channel))
  const red = clampChannel(
    4.0767416621 * linearLightness - 3.3077115913 * linearMedium + 0.2309699292 * linearShort,
  )
  const green = clampChannel(
    -1.2684380046 * linearLightness + 2.6097574011 * linearMedium - 0.3413193965 * linearShort,
  )
  const blue = clampChannel(
    -0.0041960863 * linearLightness - 0.7034186147 * linearMedium + 1.707614701 * linearShort,
  )
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function getColorRelativeLuminance(color: string): number {
  if (/^#[\da-f]{6}$/i.test(color))
    return getHexRelativeLuminance(color)
  return getOklchRelativeLuminance(color)
}

function getColorContrastRatio(firstColor: string, secondColor: string): number {
  const firstLuminance = getColorRelativeLuminance(firstColor)
  const secondLuminance = getColorRelativeLuminance(secondColor)
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05)
    / (Math.min(firstLuminance, secondLuminance) + 0.05)
  )
}

function getReadableForeground(background: string): '#000000' | '#ffffff' {
  const relativeLuminance = getColorRelativeLuminance(background)
  const whiteContrast = 1.05 / (relativeLuminance + 0.05)
  return whiteContrast >= 4.5 ? '#ffffff' : '#000000'
}

function getReadableOnSurfaceColor(
  color: string,
  surface: string,
  minimumContrast: number,
): string {
  return getColorContrastRatio(color, surface) >= minimumContrast
    ? color
    : getReadableForeground(surface)
}

/**
 * Returns the complete semantic token set consumed by Tailwind utilities and Unovis charts.
 */
export function getThemeCssVariables(
  colorId: ThemeColorId,
  customColor: string,
  semanticColors: SemanticThemeColors,
  isDark: boolean,
): Record<string, string> {
  const preset = getPreset(colorId)
  const primaryVars
    = colorId === 'custom'
      ? customThemeColorVars(customColor, isDark)
      : ((isDark ? preset?.dark : preset?.light) ?? themeColorVars(customColor, isDark))
  const success = semanticTone(semanticColors.success, isDark)
  const warning = semanticTone(semanticColors.warning, isDark)
  const destructive = semanticTone(semanticColors.destructive, isDark)
  const pageSurface = isDark ? DARK_PAGE_SURFACE : LIGHT_PAGE_SURFACE

  return {
    '--primary': primaryVars.primary,
    '--primary-foreground': primaryVars.primaryForeground,
    '--primary-text': primaryVars.primaryText,
    '--primary-muted': `color-mix(in oklch, ${primaryVars.primary} 14%, transparent)`,
    '--ring': primaryVars.ring,
    '--accent-foreground': primaryVars.accentForeground,
    '--sidebar-primary': primaryVars.sidebarPrimary,
    '--sidebar-primary-foreground': primaryVars.sidebarPrimaryForeground,
    '--sidebar-accent-foreground': primaryVars.sidebarAccentForeground,
    '--success': success,
    // AI modified: user-selected semantic colors always receive a WCAG-readable solid foreground.
    '--success-foreground': getReadableForeground(success),
    '--success-text': getReadableOnSurfaceColor(success, pageSurface, 4.5),
    '--success-muted': `color-mix(in oklch, ${success} 14%, transparent)`,
    '--warning': warning,
    '--warning-foreground': getReadableForeground(warning),
    '--warning-text': getReadableOnSurfaceColor(warning, pageSurface, 4.5),
    '--warning-muted': `color-mix(in oklch, ${warning} 16%, transparent)`,
    '--destructive': destructive,
    '--destructive-foreground': getReadableForeground(destructive),
    '--destructive-text': getReadableOnSurfaceColor(destructive, pageSurface, 4.5),
    '--destructive-muted': `color-mix(in oklch, ${destructive} 14%, transparent)`,
    '--chart-1': primaryVars.chart1,
    '--chart-2': success,
    '--chart-3': warning,
    '--chart-4': destructive,
    '--chart-5': `color-mix(in oklch, ${primaryVars.chart1} 58%, ${success} 42%)`,
  }
}
