<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import ErrorState from "@/views/errors/ErrorState.vue";

const router = useRouter();
const { t } = useI18n();
</script>

<template>
  <ErrorState
    code="404"
    :title="t('pages.notFound.title')"
    :description="t('pages.notFound.description')"
    primary-label="Open dashboard"
    @primary="router.push({ name: 'dashboard' })"
  />
</template>
