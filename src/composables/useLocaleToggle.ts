import type { EffectScope } from 'vue'
import { storeToRefs } from 'pinia'
import { computed, effectScope, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'
import { useAppearanceStore } from '@/stores/appearance'

type AppearanceStore = ReturnType<typeof useAppearanceStore>

let activeAppearanceStore: AppearanceStore | undefined
let localeEffectScope: EffectScope | undefined

export function startAppLocaleSync(appearance: AppearanceStore = useAppearanceStore()): void {
  if (activeAppearanceStore === appearance && localeEffectScope?.active) return

  localeEffectScope?.stop()
  activeAppearanceStore = appearance
  localeEffectScope = effectScope(true)
  localeEffectScope.run(() => {
    watch(
      () => appearance.locale,
      (locale) => {
        // AI modified: AppSettings owns locale; vue-i18n and the document are projections of it.
        setLocale(locale)
      },
      { immediate: true, flush: 'sync' },
    )
  })
}

export function useLocaleToggle() {
  const appearance = useAppearanceStore()
  const { locale } = storeToRefs(appearance)
  const { t } = useI18n()
  startAppLocaleSync(appearance)

  const localeLabel = computed(() =>
    locale.value === 'zh-CN' ? t('common.languageChinese') : t('common.languageEnglish'),
  )

  function toggleLocale(): void {
    appearance.setLocale(locale.value === 'zh-CN' ? 'en-US' : 'zh-CN')
  }

  return {
    locale,
    localeLabel,
    toggleLocale,
  }
}
