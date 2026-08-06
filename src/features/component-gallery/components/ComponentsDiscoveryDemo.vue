<script setup lang="ts">
import type { SearchableSelectOption } from '@/components/admin'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { PermissionGate, SearchableSelect } from '@/components/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ComponentDemoCard from './ComponentDemoCard.vue'

interface TeamMember {
  id: string
  name: string
  team: string
}

const { t } = useI18n()
const selectedMemberId = shallowRef<string | null>(null)
const latestSearch = shallowRef('')

const teamMembers = computed<TeamMember[]>(() =>
  Array.from({ length: 500 }, (_, index) => ({
    id: `member-${index + 1}`,
    name: `${['Avery Chen', 'Jordan Wu', 'Skyler Li', 'Riley Park'][index % 4]} ${index + 1}`,
    team: ['Growth', 'Platform', 'Operations', 'Support'][index % 4]!,
  })),
)
const memberOptions = computed<SearchableSelectOption[]>(() =>
  teamMembers.value.map((member) => ({
    value: member.id,
    label: member.name,
    keywords: [member.team, member.id],
  })),
)
const selectedMember = computed(() =>
  teamMembers.value.find((member) => member.id === selectedMemberId.value),
)

function rememberSearch(searchTerm: string): void {
  latestSearch.value = searchTerm
}
</script>

<template>
  <div class="space-y-4">
    <ComponentDemoCard
      :title="t('components.discovery.searchTitle')"
      :description="t('components.discovery.searchDescription')"
    >
      <div class="max-w-md space-y-3">
        <SearchableSelect
          v-model="selectedMemberId"
          :options="memberOptions"
          :placeholder="t('components.discovery.selectMember')"
          :search-placeholder="t('components.discovery.searchMembers')"
          :empty-label="t('components.discovery.emptyMembers')"
          :clear-label="t('components.discovery.clearMember')"
          :label="t('components.discovery.memberLabel')"
          clearable
          @search="rememberSearch"
        >
          <template #option="{ option }">
            <span class="truncate">{{ option.label }}</span>
          </template>
        </SearchableSelect>
        <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge v-if="selectedMember" variant="secondary">
            {{
              t('components.discovery.selectedMember', {
                name: selectedMember.name,
                team: selectedMember.team,
              })
            }}
          </Badge>
          <span v-if="latestSearch">{{
            t('components.discovery.lastSearch', { query: latestSearch })
          }}</span>
          <span v-else>{{
            t('components.discovery.virtualizedHint', { count: teamMembers.length })
          }}</span>
        </div>
      </div>
      <template #usage>
        &lt;SearchableSelect v-model="memberId" :options="members" @search="fetchMembers" /&gt;
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="t('components.discovery.accessTitle')"
      :description="t('components.discovery.accessDescription')"
    >
      <PermissionGate
        action="update"
        subject="Settings"
        :fallback="t('components.discovery.accessFallback')"
      >
        <Button type="button">
          {{ t('components.discovery.restrictedAction') }}
        </Button>
        <template #fallback>
          <p class="text-sm text-muted-foreground">
            {{ t('components.discovery.accessFallback') }}
          </p>
        </template>
      </PermissionGate>
      <template #usage>
        &lt;PermissionGate action="update" subject="Settings"&gt;…&lt;/PermissionGate&gt;
      </template>
    </ComponentDemoCard>
  </div>
</template>
