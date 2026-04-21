import { createI18n, type Composer } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

export type MessageSchema = typeof zhCN

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const LOCALE_STORAGE_KEY = 'locale'

function getDefaultLocale(): SupportedLocale {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY) as SupportedLocale | null
  if (stored && SUPPORTED_LOCALES.includes(stored)) return stored

  const browserLang = navigator.language
  if (browserLang.startsWith('zh')) return 'zh-CN'
  return 'en-US'
}

export const i18n = createI18n<[MessageSchema], SupportedLocale>({
  legacy: false,
  locale: getDefaultLocale(),
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
})

export function setLocale(locale: SupportedLocale) {
  const composer = i18n.global as unknown as Composer
  composer.locale.value = locale
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  document.documentElement.lang = locale
}
