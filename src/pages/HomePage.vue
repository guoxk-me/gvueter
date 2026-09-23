<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const { t } = useI18n()
</script>

<template>
  <!-- AI modified: one public route proves configuration, Vue, and deployment without retaining business UI. -->
  <main class="flex min-h-svh items-center justify-center bg-background px-6 py-12">
    <Card class="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{{ t('home.title') }}</CardTitle>
        <CardDescription>{{ t('home.description') }}</CardDescription>
      </CardHeader>
      <CardContent class="text-sm text-muted-foreground">
        {{ t('home.ready') }}
      </CardContent>
    </Card>
  </main>
</template>
