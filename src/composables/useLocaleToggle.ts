import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale, type SupportedLocale } from '@/i18n'

export function useLocaleToggle() {
  const { locale, t } = useI18n()

  const localeLabel = computed(() =>
    locale.value === 'zh-CN' ? t('common.languageChinese') : t('common.languageEnglish'),
  )

  function toggleLocale() {
    const next: SupportedLocale = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
    setLocale(next)
  }

  return {
    locale,
    localeLabel,
    toggleLocale,
  }
}
