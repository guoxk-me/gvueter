<script setup lang="ts">
import type { RoleDefinition } from '@/features/roles/types'
import { ShieldCheck } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{
  roles: RoleDefinition[]
  selectedRoleKey: RoleDefinition['key']
}>()

const emit = defineEmits<{
  select: [roleKey: RoleDefinition['key']]
}>()

const { t } = useI18n()
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-3">
    <button
      v-for="role in roles"
      :key="role.key"
      type="button"
      class="rounded-xl text-left outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      :aria-pressed="role.key === selectedRoleKey"
      @click="emit('select', role.key)"
    >
      <Card
        :class="
          role.key === selectedRoleKey ? 'border-primary shadow-sm' : 'hover:border-primary/50'
        "
      >
        <CardHeader class="space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div
              class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <ShieldCheck class="size-5" aria-hidden="true" />
            </div>
            <div class="flex flex-wrap justify-end gap-1.5">
              <!-- AI modified: the super-administrator difference stays visible beside ordinary role scopes. -->
              <Badge v-if="role.key === 'admin'" variant="default">
                {{ t('roles.superAdminBadge') }}
              </Badge>
              <Badge variant="outline">
                {{ t(`roles.dataScope.${role.dataScope.scope}`) }}
              </Badge>
              <Badge variant="secondary">
                {{ role.permissions.length }}
              </Badge>
            </div>
          </div>
          <CardTitle class="text-base">
            {{ t(`roles.${role.key}`) }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-sm text-muted-foreground">
            {{ t(`roles.${role.key}Description`) }}
          </p>
        </CardContent>
      </Card>
    </button>
  </div>
</template>
