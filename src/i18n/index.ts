import type { Composer } from 'vue-i18n'
import { createI18n } from 'vue-i18n'
import { getBrowserStorage, safeStorageGet, safeStorageSet } from '@/lib/browser-storage'
import enUS from './locales/en-US'
import zhCN from './locales/zh-CN'

export type MessageSchema = typeof zhCN

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const LOCALE_STORAGE_KEY = 'locale'

function isSupportedLocale(locale: string | null): locale is SupportedLocale {
  return locale === 'zh-CN' || locale === 'en-US'
}

function getDefaultLocale(): SupportedLocale {
  const storedLocale = safeStorageGet(getBrowserStorage('local'), LOCALE_STORAGE_KEY)
  if (isSupportedLocale(storedLocale)) return storedLocale

  // AI modified: locale bootstrapping remains deterministic when browser globals are restricted.
  const browserLang = typeof navigator === 'undefined' ? 'en-US' : navigator.language
  if (browserLang.startsWith('zh')) return 'zh-CN'
  return 'en-US'
}

const initialLocale = getDefaultLocale()

export const i18n = createI18n<[MessageSchema], SupportedLocale>({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
})

// AI modified: apply the persisted or browser-derived locale before the first render.
if (typeof document !== 'undefined') document.documentElement.lang = initialLocale

export function setLocale(locale: SupportedLocale): void {
  const composer = i18n.global as unknown as Composer
  composer.locale.value = locale
  safeStorageSet(getBrowserStorage('local'), LOCALE_STORAGE_KEY, locale)
  if (typeof document !== 'undefined') document.documentElement.lang = locale
}
