<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import ErrorState from "@/views/errors/ErrorState.vue";

const router = useRouter();
const { t } = useI18n();
</script>

<template>
  <ErrorState
    code="403"
    :title="t('pages.forbidden.title')"
    :description="t('pages.forbidden.description')"
    primary-label="Back to dashboard"
    @primary="router.push({ name: 'dashboard' })"
  />
</template>
