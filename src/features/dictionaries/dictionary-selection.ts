import type { DictionaryType } from './types'

export function getSelectedDictionaryTypeId(
  dictionaryTypes: DictionaryType[],
  currentDictionaryTypeId?: string,
): string | undefined {
  // AI modified: preserve a valid selection and otherwise fall back to the first server-ordered type.
  return dictionaryTypes.some((dictionaryType) => dictionaryType.id === currentDictionaryTypeId)
    ? currentDictionaryTypeId
    : dictionaryTypes[0]?.id
}
