<script setup lang="ts">
import type {
  DictionaryEntry,
  DictionaryEntryInput,
  DictionaryType,
  DictionaryTypeInput,
} from '@/features/dictionaries/types'
import { Plus } from '@lucide/vue'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import { Callout, PageHeader } from '@/components/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDictionaryManagement } from '@/features/dictionaries/composables/useDictionaryManagement'
import { getSelectedDictionaryTypeId } from '@/features/dictionaries/dictionary-selection'
import { canAccess } from '@/lib/ability'
import { ApiError } from '@/lib/http'
import DictionaryEntryDialog from './DictionaryEntryDialog.vue'
import DictionaryEntryTable from './DictionaryEntryTable.vue'
import DictionaryTypeDialog from './DictionaryTypeDialog.vue'
import DictionaryTypeList from './DictionaryTypeList.vue'

const emit = defineEmits<{
  dictionaryTypeOptionsReady: [dictionaryTypeIds: readonly string[]]
}>()
const { t } = useI18n()
const selectedDictionaryTypeId = defineModel<string | undefined>('selectedDictionaryTypeId')
const isTypeDialogOpen = shallowRef(false)
const isEntryDialogOpen = shallowRef(false)
const editingDictionaryType = shallowRef<DictionaryType>()
const editingDictionaryEntry = shallowRef<DictionaryEntry>()
const canManage = computed(() => canAccess('update', 'Settings'))
const {
  dictionaryTypes,
  dictionaryEntries,
  typesError,
  entriesError,
  isLoadingTypes,
  isLoadingEntries,
  isSavingType,
  isDeletingType,
  isSavingEntry,
  isDeletingEntry,
  saveDictionaryType,
  deleteDictionaryType,
  saveDictionaryEntry,
  deleteDictionaryEntry,
} = useDictionaryManagement(selectedDictionaryTypeId)
const selectedDictionaryType = computed(() =>
  dictionaryTypes.value.find(
    (dictionaryType) => dictionaryType.id === selectedDictionaryTypeId.value,
  ),
)

watch(
  [dictionaryTypes, isLoadingTypes],
  ([availableDictionaryTypes, areTypesLoading]) => {
    if (areTypesLoading) return
    emit(
      'dictionaryTypeOptionsReady',
      availableDictionaryTypes.map((dictionaryType) => dictionaryType.id),
    )
    // AI modified: selection survives refreshes and safely advances when a type is deleted.
    selectedDictionaryTypeId.value = getSelectedDictionaryTypeId(
      availableDictionaryTypes,
      selectedDictionaryTypeId.value,
    )
  },
  { immediate: true },
)

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : t('errors.networkError')
}

function createDictionaryType(): void {
  editingDictionaryType.value = undefined
  isTypeDialogOpen.value = true
}

function editDictionaryType(dictionaryType: DictionaryType): void {
  editingDictionaryType.value = dictionaryType
  isTypeDialogOpen.value = true
}

function createDictionaryEntry(): void {
  editingDictionaryEntry.value = undefined
  isEntryDialogOpen.value = true
}

function editDictionaryEntry(dictionaryEntry: DictionaryEntry): void {
  editingDictionaryEntry.value = dictionaryEntry
  isEntryDialogOpen.value = true
}

async function saveType(input: DictionaryTypeInput): Promise<void> {
  try {
    const savedDictionaryType = await saveDictionaryType({
      dictionaryType: editingDictionaryType.value,
      input,
    })
    selectedDictionaryTypeId.value = savedDictionaryType.id
    isTypeDialogOpen.value = false
    toast.success(t('dictionaries.typeSaveSuccess'))
  } catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

async function removeDictionaryType(dictionaryType: DictionaryType): Promise<void> {
  try {
    await deleteDictionaryType(dictionaryType)
    toast.success(t('dictionaries.typeDeleteSuccess'))
  } catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

async function saveEntry(input: DictionaryEntryInput): Promise<void> {
  try {
    await saveDictionaryEntry({ dictionaryEntry: editingDictionaryEntry.value, input })
    isEntryDialogOpen.value = false
    toast.success(t('dictionaries.entrySaveSuccess'))
  } catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}

async function removeDictionaryEntry(dictionaryEntry: DictionaryEntry): Promise<void> {
  try {
    await deleteDictionaryEntry(dictionaryEntry)
    toast.success(t('dictionaries.entryDeleteSuccess'))
  } catch (error: unknown) {
    toast.error(getErrorMessage(error))
  }
}
</script>

<template>
  <section class="space-y-6">
    <PageHeader :title="t('dictionaries.title')" :description="t('dictionaries.description')">
      <template #actions>
        <Button v-if="canManage" type="button" @click="createDictionaryType">
          <Plus class="size-4" aria-hidden="true" />
          {{ t('dictionaries.createType') }}
        </Button>
      </template>
    </PageHeader>

    <Callout
      v-if="!canManage"
      :title="t('dictionaries.readOnlyTitle')"
      :description="t('dictionaries.readOnlyDescription')"
    />

    <div
      v-if="typesError"
      class="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
      role="alert"
    >
      {{ getErrorMessage(typesError) }}
    </div>

    <div class="grid gap-5 lg:grid-cols-[minmax(15rem,19rem)_minmax(0,1fr)]">
      <Card class="h-fit">
        <CardHeader>
          <CardTitle>{{ t('dictionaries.types') }}</CardTitle>
          <CardDescription>{{ t('dictionaries.typesDescription') }}</CardDescription>
        </CardHeader>
        <CardContent>
          <DictionaryTypeList
            :dictionary-types="dictionaryTypes"
            :selected-dictionary-type-id="selectedDictionaryTypeId"
            :is-loading="isLoadingTypes"
            :is-deleting="isDeletingType"
            :can-manage="canManage"
            @select="selectedDictionaryTypeId = $event"
            @edit="editDictionaryType"
            @delete="removeDictionaryType"
          />
        </CardContent>
      </Card>

      <Card class="min-w-0">
        <CardHeader class="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-1">
            <CardTitle>
              {{ selectedDictionaryType?.name ?? t('dictionaries.entries') }}
            </CardTitle>
            <CardDescription>
              {{ selectedDictionaryType?.description || t('dictionaries.selectTypeHint') }}
            </CardDescription>
          </div>
          <Button
            v-if="canManage && selectedDictionaryType"
            type="button"
            size="sm"
            @click="createDictionaryEntry"
          >
            <Plus class="size-4" aria-hidden="true" />
            {{ t('dictionaries.createEntry') }}
          </Button>
        </CardHeader>
        <CardContent class="space-y-4">
          <div
            v-if="entriesError"
            class="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
            role="alert"
          >
            {{ getErrorMessage(entriesError) }}
          </div>
          <DictionaryEntryTable
            :dictionary-entries="dictionaryEntries"
            :is-loading="isLoadingEntries && Boolean(selectedDictionaryTypeId)"
            :is-deleting="isDeletingEntry"
            :can-manage="canManage"
            @edit="editDictionaryEntry"
            @delete="removeDictionaryEntry"
          />
        </CardContent>
      </Card>
    </div>

    <DictionaryTypeDialog
      v-model:open="isTypeDialogOpen"
      :dictionary-type="editingDictionaryType"
      :is-saving="isSavingType"
      @save="saveType"
    />
    <DictionaryEntryDialog
      v-model:open="isEntryDialogOpen"
      :dictionary-entry="editingDictionaryEntry"
      :is-saving="isSavingEntry"
      @save="saveEntry"
    />
  </section>
</template>
