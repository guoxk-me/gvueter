<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { Moon, Sun } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/composables/useTheme'
import { setLocale, type SupportedLocale } from '@/i18n'

const { t, locale } = useI18n()
const { isDark, toggleTheme } = useTheme()

const localeLabel = computed(() => (locale.value === 'zh-CN' ? 'EN' : '中'))
const localeSwitchAriaLabel = computed(() =>
  locale.value === 'zh-CN' ? t('common.switchToEn') : t('common.switchToZh'),
)
const themeAriaLabel = computed(() => (isDark.value ? t('common.lightMode') : t('common.darkMode')))

function toggleLocale() {
  const next: SupportedLocale = locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
  setLocale(next)
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-background">
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,_var(--color-primary)_10%,_transparent),_transparent_38%),linear-gradient(180deg,_color-mix(in_oklab,_var(--color-muted)_55%,_transparent),_transparent_42%)]"
    />

    <div class="absolute right-4 top-4 z-10 flex items-center gap-1 sm:right-6 sm:top-6">
      <Button
        variant="ghost"
        size="icon"
        :aria-label="themeAriaLabel"
        :aria-pressed="isDark"
        @click="toggleTheme($event)"
      >
        <Sun v-if="isDark" class="size-4" aria-hidden="true" />
        <Moon v-else class="size-4" aria-hidden="true" />
      </Button>

      <Button
        variant="ghost"
        class="w-10 text-sm font-medium"
        :aria-label="localeSwitchAriaLabel"
        :lang="locale === 'zh-CN' ? 'en' : 'zh-CN'"
        @click="toggleLocale"
      >
        {{ localeLabel }}
      </Button>
    </div>

    <main class="relative z-0 flex min-h-screen items-center justify-center px-4 py-16">
      <div class="w-full max-w-md space-y-6">
        <RouterView />
        <p class="text-center text-xs text-muted-foreground">
          {{ t('common.copyright', { year: new Date().getFullYear() }) }}
        </p>
      </div>
    </main>
  </div>
</template>
