<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer
    class="border-t border-border bg-background px-4 py-3 text-center text-xs text-muted-foreground"
    data-admin-footer
  >
    {{ t('common.copyright', { year: currentYear }) }}
  </footer>
</template>
