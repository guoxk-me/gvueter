import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { badgeVariants } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { getThemeCssVariables, THEME_PRESETS } from '@/lib/theme-presets'

interface OklchColor {
  lightness: number
  chroma: number
  hue: number
}

const minimumTextContrast = 4.5
const themeSource = readFileSync('src/assets/css/main.css', 'utf8')

function readThemeBlock(selector: ':root' | '.dark'): string {
  const escapedSelector = selector === ':root' ? ':root' : '\\.dark'
  const block = themeSource.match(
    new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`),
  )?.[1]
  if (!block)
    throw new Error(`Missing ${selector} theme block`)
  return block
}

function readOklchToken(themeBlock: string, tokenName: string): OklchColor {
  const tokenValue = themeBlock.match(new RegExp(`--${tokenName}:\\s*([^;]+);`))?.[1]?.trim()
  if (!tokenValue)
    throw new Error(`Missing theme token: ${tokenName}`)

  const variableReference = tokenValue.match(/^var\(--([\w-]+)\)$/)?.[1]
  if (variableReference)
    return readOklchToken(themeBlock, variableReference)

  const mixedTokens = tokenValue.match(
    /^color-mix\(in oklch, var\(--([\w-]+)\) ([\d.]+)%, var\(--([\w-]+)\)\)$/,
  )
  if (mixedTokens?.[1] && mixedTokens[2] && mixedTokens[3]) {
    const firstColor = readOklchToken(themeBlock, mixedTokens[1])
    const secondColor = readOklchToken(themeBlock, mixedTokens[3])
    const firstWeight = Number.parseFloat(mixedTokens[2]) / 100
    const secondWeight = 1 - firstWeight
    const hueDelta = ((secondColor.hue - firstColor.hue + 540) % 360) - 180
    // AI modified: static contrast checks resolve the semantic var/color-mix aliases used by Quiet Layers.
    return {
      lightness: firstColor.lightness * firstWeight + secondColor.lightness * secondWeight,
      chroma: firstColor.chroma * firstWeight + secondColor.chroma * secondWeight,
      hue:
        firstColor.chroma === 0
          ? secondColor.hue
          : secondColor.chroma === 0
            ? firstColor.hue
            : (firstColor.hue + hueDelta * secondWeight + 360) % 360,
    }
  }

  const token = tokenValue.match(/^oklch\(([^)]+)\)$/)?.[1]
  if (!token)
    throw new Error(`Unsupported theme token: ${tokenName} = ${tokenValue}`)
  const [lightnessPart = '', chromaPart = '', huePart = '0'] = token.trim().split(/\s+/)
  const lightness = Number.parseFloat(lightnessPart) / (lightnessPart.endsWith('%') ? 100 : 1)
  return {
    lightness,
    chroma: Number.parseFloat(chromaPart),
    hue: Number.parseFloat(huePart),
  }
}

function getRelativeLuminance(color: OklchColor): number {
  const hueRadians = (color.hue * Math.PI) / 180
  const labA = color.chroma * Math.cos(hueRadians)
  const labB = color.chroma * Math.sin(hueRadians)
  const lRoot = color.lightness + 0.3963377774 * labA + 0.2158037573 * labB
  const mRoot = color.lightness - 0.1055613458 * labA - 0.0638541728 * labB
  const sRoot = color.lightness - 0.0894841775 * labA - 1.291485548 * labB
  const lightness = lRoot ** 3
  const medium = mRoot ** 3
  const short = sRoot ** 3
  const red = Math.min(
    1,
    Math.max(0, 4.0767416621 * lightness - 3.3077115913 * medium + 0.2309699292 * short),
  )
  const green = Math.min(
    1,
    Math.max(0, -1.2684380046 * lightness + 2.6097574011 * medium - 0.3413193965 * short),
  )
  const blue = Math.min(
    1,
    Math.max(0, -0.0041960863 * lightness - 0.7034186147 * medium + 1.707614701 * short),
  )
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function getContrastRatio(firstColor: OklchColor, secondColor: OklchColor): number {
  const firstLuminance = getRelativeLuminance(firstColor)
  const secondLuminance = getRelativeLuminance(secondColor)
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05)
    / (Math.min(firstLuminance, secondLuminance) + 0.05)
  )
}

function getHexRelativeLuminance(color: string): number {
  if (!/^#[\da-f]{6}$/i.test(color))
    throw new Error(`Expected a six-digit hex color: ${color}`)
  const channels = [1, 3, 5].map((startIndex) => {
    const channel = Number.parseInt(color.slice(startIndex, startIndex + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

function getHexContrastRatio(firstColor: string, secondColor: string): number {
  const firstLuminance = getHexRelativeLuminance(firstColor)
  const secondLuminance = getHexRelativeLuminance(secondColor)
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05)
    / (Math.min(firstLuminance, secondLuminance) + 0.05)
  )
}

function getRuntimeColorRelativeLuminance(color: string): number {
  if (/^#[\da-f]{6}$/i.test(color))
    return getHexRelativeLuminance(color)
  const token = color.match(/^oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+(-?[\d.]+)(?:deg)?\s*\)$/i)
  if (!token?.[1] || !token[3] || !token[4])
    throw new Error(`Expected a concrete runtime color: ${color}`)
  return getRelativeLuminance({
    lightness: Number.parseFloat(token[1]) / (token[2] ? 100 : 1),
    chroma: Number.parseFloat(token[3]),
    hue: Number.parseFloat(token[4]),
  })
}

function getRuntimeContrastRatio(firstColor: string, secondColor: string): number {
  const firstLuminance = getRuntimeColorRelativeLuminance(firstColor)
  const secondLuminance = getRuntimeColorRelativeLuminance(secondColor)
  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05)
    / (Math.min(firstLuminance, secondLuminance) + 0.05)
  )
}

function getRuntimeToOklchContrastRatio(runtimeColor: string, surfaceColor: OklchColor): number {
  const runtimeLuminance = getRuntimeColorRelativeLuminance(runtimeColor)
  const surfaceLuminance = getRelativeLuminance(surfaceColor)
  return (
    (Math.max(runtimeLuminance, surfaceLuminance) + 0.05)
    / (Math.min(runtimeLuminance, surfaceLuminance) + 0.05)
  )
}

it('declares the dark native-control color scheme with the selected theme', () => {
  // AI modified: native form widgets are part of the dark-theme accessibility contract.
  expect(readThemeBlock('.dark')).toMatch(/\bcolor-scheme:\s*dark;/)
})

describe.each([
  ['light', readThemeBlock(':root')],
  ['dark', readThemeBlock('.dark')],
] as const)('%s theme contrast', (_themeName, themeBlock) => {
  const surfacePairs = [
    ['background', 'foreground'],
    ['card', 'card-foreground'],
    ['popover', 'popover-foreground'],
    ['secondary', 'secondary-foreground'],
    ['muted', 'muted-foreground'],
    ['accent', 'accent-foreground'],
    ['sidebar', 'sidebar-foreground'],
    ['sidebar-accent', 'sidebar-accent-foreground'],
  ] as const
  const solidPairs = [
    ['primary', 'primary-foreground'],
    ['destructive', 'destructive-foreground'],
    ['info', 'info-foreground'],
    ['success', 'success-foreground'],
    ['warning', 'warning-foreground'],
    ['sidebar-primary', 'sidebar-primary-foreground'],
  ] as const

  it.each([...surfacePairs, ...solidPairs])(
    '%s and %s meet normal-text contrast',
    (surfaceToken, textToken) => {
      expect(
        getContrastRatio(
          readOklchToken(themeBlock, surfaceToken),
          readOklchToken(themeBlock, textToken),
        ),
      ).toBeGreaterThanOrEqual(minimumTextContrast)
    },
  )

  it.each(['primary', 'destructive', 'info', 'success', 'warning', 'accent-foreground'] as const)(
    '%s remains readable as semantic text on the page background',
    (textToken) => {
      expect(
        getContrastRatio(
          readOklchToken(themeBlock, 'background'),
          readOklchToken(themeBlock, textToken),
        ),
      ).toBeGreaterThanOrEqual(minimumTextContrast)
    },
  )
})

describe.each([
  ['light', false, readThemeBlock(':root')],
  ['dark', true, readThemeBlock('.dark')],
] as const)('%s runtime semantic colors', (_themeName, isDark, themeBlock) => {
  it.each([
    ['defaults', { success: '#16a34a', warning: '#d97706', destructive: '#dc2626' }],
    ['light and dark edges', { success: '#ffffff', warning: '#000000', destructive: '#808080' }],
  ] as const)('%s retain readable solid foregrounds', (_paletteName, semanticColors) => {
    const variables = getThemeCssVariables('violet', '#8b5cf6', semanticColors, isDark)

    // AI modified: persisted user colors cannot create unreadable badges or rich toasts.
    for (const tone of ['success', 'warning', 'destructive'] as const) {
      expect(
        getHexContrastRatio(variables[`--${tone}`]!, variables[`--${tone}-foreground`]!),
      ).toBeGreaterThanOrEqual(minimumTextContrast)
      expect(
        getRuntimeToOklchContrastRatio(
          variables[`--${tone}-text`]!,
          readOklchToken(themeBlock, 'background'),
        ),
      ).toBeGreaterThanOrEqual(minimumTextContrast)
    }
  })
})

describe.each([
  ['light', false, readThemeBlock(':root')],
  ['dark', true, readThemeBlock('.dark')],
] as const)('%s runtime primary colors', (_themeName, isDark, themeBlock) => {
  const semanticColors = {
    success: '#16a34a',
    warning: '#d97706',
    destructive: '#dc2626',
  }

  it.each(THEME_PRESETS)(
    '$labelEn preset retains readable solid and accent foregrounds',
    (preset) => {
      const variables = getThemeCssVariables(preset.id, '#8b5cf6', semanticColors, isDark)

      // AI modified: every shipped runtime palette is checked instead of relying on static CSS tokens.
      for (const [backgroundToken, foregroundToken] of [
        ['--primary', '--primary-foreground'],
        ['--sidebar-primary', '--sidebar-primary-foreground'],
      ] as const) {
        expect(
          getRuntimeContrastRatio(variables[backgroundToken]!, variables[foregroundToken]!),
        ).toBeGreaterThanOrEqual(minimumTextContrast)
      }

      expect(
        getRuntimeToOklchContrastRatio(
          variables['--primary-text']!,
          readOklchToken(themeBlock, 'background'),
        ),
      ).toBeGreaterThanOrEqual(minimumTextContrast)
      expect(
        getRuntimeToOklchContrastRatio(
          variables['--ring']!,
          readOklchToken(themeBlock, 'background'),
        ),
      ).toBeGreaterThanOrEqual(3)

      for (const [surfaceToken, foregroundToken] of [
        ['accent', '--accent-foreground'],
        ['sidebar-accent', '--sidebar-accent-foreground'],
      ] as const) {
        expect(
          getRuntimeToOklchContrastRatio(
            variables[foregroundToken]!,
            readOklchToken(themeBlock, surfaceToken),
          ),
        ).toBeGreaterThanOrEqual(minimumTextContrast)
      }
    },
  )

  it.each(['#000000', '#808080', '#ffffff'])(
    'custom %s retains readable primary foregrounds',
    (customColor) => {
      const variables = getThemeCssVariables('custom', customColor, semanticColors, isDark)
      expect(
        getRuntimeContrastRatio(variables['--primary']!, variables['--primary-foreground']!),
      ).toBeGreaterThanOrEqual(minimumTextContrast)
      expect(
        getRuntimeContrastRatio(
          variables['--sidebar-primary']!,
          variables['--sidebar-primary-foreground']!,
        ),
      ).toBeGreaterThanOrEqual(minimumTextContrast)
      expect(
        getRuntimeToOklchContrastRatio(
          variables['--primary-text']!,
          readOklchToken(themeBlock, 'background'),
        ),
      ).toBeGreaterThanOrEqual(minimumTextContrast)
      expect(
        getRuntimeToOklchContrastRatio(
          variables['--ring']!,
          readOklchToken(themeBlock, 'background'),
        ),
      ).toBeGreaterThanOrEqual(3)
    },
  )
})

it('routes destructive component variants through the runtime foreground token', () => {
  for (const variantClasses of [
    buttonVariants({ variant: 'destructive' }),
    badgeVariants({ variant: 'destructive' }),
  ]) {
    expect(variantClasses).toContain('text-destructive-foreground')
    expect(variantClasses).not.toContain('text-white')
  }
})
