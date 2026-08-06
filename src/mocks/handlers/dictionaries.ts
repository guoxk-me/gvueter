import type {
  DictionaryEntry,
  DictionaryEntryInput,
  DictionaryEntryListResponse,
  DictionaryOptionResponse,
  DictionaryType,
  DictionaryTypeInput,
  DictionaryTypeListResponse,
} from '@/features/dictionaries/types'
import type { ApiResponse } from '@/lib/http'
import { http, HttpResponse } from 'msw'
import {
  DICTIONARY_ENTRY_INPUT_SCHEMA,
  DICTIONARY_TYPE_INPUT_SCHEMA,
} from '@/features/dictionaries/dictionary-api-contracts'
import { readMockJsonBody } from '@/mocks/request-validation'
import { authenticateMockRequest, authorizeMockPermission } from './auth'

const initialDictionaryTypes: DictionaryType[] = [
  {
    id: 'account-status',
    code: 'account_status',
    name: 'Account status',
    description: 'Shared labels and colors for account availability.',
    status: 'active',
    updatedAt: '2026-07-01T08:00:00.000Z',
  },
  {
    id: 'announcement-priority',
    code: 'announcement_priority',
    name: 'Announcement priority',
    description: 'Priority labels used by system announcements.',
    status: 'active',
    updatedAt: '2026-07-02T08:00:00.000Z',
  },
]

const initialDictionaryEntries: DictionaryEntry[] = [
  {
    id: 'account-active',
    typeId: 'account-status',
    label: 'Active',
    value: 'active',
    color: 'success',
    order: 10,
    status: 'active',
  },
  {
    id: 'account-suspended',
    typeId: 'account-status',
    label: 'Suspended',
    value: 'suspended',
    color: 'destructive',
    order: 20,
    status: 'active',
  },
  // AI modified: shared status options include review and lock states without widening the user API contract.
  {
    id: 'account-locked',
    typeId: 'account-status',
    label: 'Locked',
    value: 'locked',
    color: 'warning',
    order: 30,
    status: 'active',
  },
  {
    id: 'account-pending',
    typeId: 'account-status',
    label: 'Pending review',
    value: 'pending',
    color: 'primary',
    order: 40,
    status: 'active',
  },
  {
    id: 'priority-normal',
    typeId: 'announcement-priority',
    label: 'Normal',
    value: 'normal',
    color: 'primary',
    order: 10,
    status: 'active',
  },
  {
    id: 'priority-important',
    typeId: 'announcement-priority',
    label: 'Important',
    value: 'important',
    color: 'warning',
    order: 20,
    status: 'active',
  },
  {
    id: 'priority-urgent',
    typeId: 'announcement-priority',
    label: 'Urgent',
    value: 'urgent',
    color: 'destructive',
    order: 30,
    status: 'active',
  },
]

const dictionaryTypes: DictionaryType[] = initialDictionaryTypes.map((dictionaryType) => ({
  ...dictionaryType,
}))
const dictionaryEntries: DictionaryEntry[] = initialDictionaryEntries.map((dictionaryEntry) => ({
  ...dictionaryEntry,
}))
let dictionaryTypeSequence = 1
let dictionaryEntrySequence = 1
const MAX_MOCK_DICTIONARY_TYPES = 200
const MAX_MOCK_DICTIONARY_ENTRIES = 1_000

function copyDictionaryType(dictionaryType: DictionaryType): DictionaryType {
  return { ...dictionaryType }
}

function copyDictionaryEntry(dictionaryEntry: DictionaryEntry): DictionaryEntry {
  return { ...dictionaryEntry }
}

function getInputFailure(message: string, code = 'INVALID_DICTIONARY_INPUT', status = 400) {
  return HttpResponse.json<ApiResponse<null>>({ code, message, data: null }, { status })
}

function findDictionaryType(dictionaryTypeId: string): DictionaryType | undefined {
  return dictionaryTypes.find((dictionaryType) => dictionaryType.id === dictionaryTypeId)
}

function findDictionaryEntry(dictionaryEntryId: string): DictionaryEntry | undefined {
  return dictionaryEntries.find((dictionaryEntry) => dictionaryEntry.id === dictionaryEntryId)
}

export function resetMockDictionaries(): void {
  dictionaryTypes.splice(
    0,
    dictionaryTypes.length,
    ...initialDictionaryTypes.map((dictionaryType) => ({ ...dictionaryType })),
  )
  dictionaryEntries.splice(
    0,
    dictionaryEntries.length,
    ...initialDictionaryEntries.map((dictionaryEntry) => ({ ...dictionaryEntry })),
  )
  dictionaryTypeSequence = 1
  dictionaryEntrySequence = 1
}

export const listDictionaryTypesHandler = http.get('/api/dictionaries/types', ({ request }) => {
  const authentication = authorizeMockPermission(request, 'read', 'Settings')
  if (!authentication.isAuthenticated) return authentication.response

  return HttpResponse.json<ApiResponse<DictionaryTypeListResponse>>({
    code: 0,
    message: 'success',
    data: { items: dictionaryTypes.map(copyDictionaryType) },
  })
})

export const createDictionaryTypeHandler = http.post<never, DictionaryTypeInput>(
  '/api/dictionaries/types',
  async ({ request }) => {
    // AI modified: dictionary management follows the editable Settings action policy.
    const authentication = authorizeMockPermission(request, 'create', 'Settings')
    if (!authentication.isAuthenticated) return authentication.response

    const requestBody = await readMockJsonBody(request, DICTIONARY_TYPE_INPUT_SCHEMA, {
      code: 'INVALID_DICTIONARY_INPUT',
      message: '字典类型信息不完整',
    })
    if (!requestBody.isValid) return requestBody.response
    const input = requestBody.body

    const code = input.code.trim()
    if (dictionaryTypes.some((dictionaryType) => dictionaryType.code === code))
      return getInputFailure('字典编码已存在', 'DICTIONARY_CODE_EXISTS', 409)
    if (dictionaryTypes.length >= MAX_MOCK_DICTIONARY_TYPES) {
      // AI modified: mutable dictionaries stay inside their executable list bounds.
      return getInputFailure('字典类型数量已达到演示环境上限', 'DICTIONARY_CAPACITY_REACHED', 409)
    }

    const dictionaryType: DictionaryType = {
      id: `dictionary-${dictionaryTypeSequence++}`,
      code,
      name: input.name.trim(),
      description: input.description.trim(),
      status: input.status,
      updatedAt: new Date().toISOString(),
    }
    dictionaryTypes.push(dictionaryType)
    return HttpResponse.json<ApiResponse<DictionaryType>>(
      { code: 0, message: 'created', data: copyDictionaryType(dictionaryType) },
      { status: 201 },
    )
  },
)

export const updateDictionaryTypeHandler = http.put<
  { dictionaryTypeId: string },
  DictionaryTypeInput
>('/api/dictionaries/types/:dictionaryTypeId', async ({ params, request }) => {
  const authentication = authorizeMockPermission(request, 'update', 'Settings')
  if (!authentication.isAuthenticated) return authentication.response

  const dictionaryType = findDictionaryType(params.dictionaryTypeId)
  if (!dictionaryType) return getInputFailure('字典类型不存在', 'DICTIONARY_TYPE_NOT_FOUND', 404)

  const requestBody = await readMockJsonBody(request, DICTIONARY_TYPE_INPUT_SCHEMA, {
    code: 'INVALID_DICTIONARY_INPUT',
    message: '字典类型信息不完整',
  })
  if (!requestBody.isValid) return requestBody.response
  const input = requestBody.body

  const code = input.code.trim()
  if (
    dictionaryTypes.some(
      (candidate) => candidate.id !== dictionaryType.id && candidate.code === code,
    )
  )
    return getInputFailure('字典编码已存在', 'DICTIONARY_CODE_EXISTS', 409)

  dictionaryType.code = code
  dictionaryType.name = input.name.trim()
  dictionaryType.description = input.description.trim()
  dictionaryType.status = input.status
  dictionaryType.updatedAt = new Date().toISOString()
  return HttpResponse.json<ApiResponse<DictionaryType>>({
    code: 0,
    message: 'updated',
    data: copyDictionaryType(dictionaryType),
  })
})

export const deleteDictionaryTypeHandler = http.delete<{ dictionaryTypeId: string }>(
  '/api/dictionaries/types/:dictionaryTypeId',
  ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'delete', 'Settings')
    if (!authentication.isAuthenticated) return authentication.response

    const dictionaryType = findDictionaryType(params.dictionaryTypeId)
    if (!dictionaryType) return getInputFailure('字典类型不存在', 'DICTIONARY_TYPE_NOT_FOUND', 404)
    if (dictionaryEntries.some((dictionaryEntry) => dictionaryEntry.typeId === dictionaryType.id))
      return getInputFailure('请先删除该类型下的字典项', 'DICTIONARY_TYPE_IN_USE', 409)

    dictionaryTypes.splice(dictionaryTypes.indexOf(dictionaryType), 1)
    return HttpResponse.json<ApiResponse<null>>({ code: 0, message: 'deleted', data: null })
  },
)

export const listDictionaryEntriesHandler = http.get<{ dictionaryTypeId: string }>(
  '/api/dictionaries/types/:dictionaryTypeId/entries',
  ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'read', 'Settings')
    if (!authentication.isAuthenticated) return authentication.response
    if (!findDictionaryType(params.dictionaryTypeId))
      return getInputFailure('字典类型不存在', 'DICTIONARY_TYPE_NOT_FOUND', 404)

    const items = dictionaryEntries
      .filter((dictionaryEntry) => dictionaryEntry.typeId === params.dictionaryTypeId)
      .sort((leftEntry, rightEntry) => leftEntry.order - rightEntry.order)
      .map(copyDictionaryEntry)
    return HttpResponse.json<ApiResponse<DictionaryEntryListResponse>>({
      code: 0,
      message: 'success',
      data: { items },
    })
  },
)

export const createDictionaryEntryHandler = http.post<
  { dictionaryTypeId: string },
  DictionaryEntryInput
>('/api/dictionaries/types/:dictionaryTypeId/entries', async ({ params, request }) => {
  const authentication = authorizeMockPermission(request, 'create', 'Settings')
  if (!authentication.isAuthenticated) return authentication.response
  if (!findDictionaryType(params.dictionaryTypeId))
    return getInputFailure('字典类型不存在', 'DICTIONARY_TYPE_NOT_FOUND', 404)

  const requestBody = await readMockJsonBody(request, DICTIONARY_ENTRY_INPUT_SCHEMA, {
    code: 'INVALID_DICTIONARY_INPUT',
    message: '字典项信息不完整',
  })
  if (!requestBody.isValid) return requestBody.response
  const input = requestBody.body
  const entryValue = input.value.trim()
  if (
    dictionaryEntries.some(
      (entry) => entry.typeId === params.dictionaryTypeId && entry.value === entryValue,
    )
  )
    return getInputFailure('字典值已存在', 'DICTIONARY_VALUE_EXISTS', 409)
  if (dictionaryEntries.length >= MAX_MOCK_DICTIONARY_ENTRIES) {
    // AI modified: the shared dictionary entry store is globally bounded across types.
    return getInputFailure('字典项数量已达到演示环境上限', 'DICTIONARY_CAPACITY_REACHED', 409)
  }

  const dictionaryEntry: DictionaryEntry = {
    id: `dictionary-entry-${dictionaryEntrySequence++}`,
    typeId: params.dictionaryTypeId,
    label: input.label.trim(),
    value: entryValue,
    color: input.color,
    order: input.order,
    status: input.status,
  }
  dictionaryEntries.push(dictionaryEntry)
  return HttpResponse.json<ApiResponse<DictionaryEntry>>(
    { code: 0, message: 'created', data: copyDictionaryEntry(dictionaryEntry) },
    { status: 201 },
  )
})

export const updateDictionaryEntryHandler = http.put<
  { dictionaryEntryId: string },
  DictionaryEntryInput
>('/api/dictionaries/entries/:dictionaryEntryId', async ({ params, request }) => {
  const authentication = authorizeMockPermission(request, 'update', 'Settings')
  if (!authentication.isAuthenticated) return authentication.response

  const dictionaryEntry = findDictionaryEntry(params.dictionaryEntryId)
  if (!dictionaryEntry) return getInputFailure('字典项不存在', 'DICTIONARY_ENTRY_NOT_FOUND', 404)

  const requestBody = await readMockJsonBody(request, DICTIONARY_ENTRY_INPUT_SCHEMA, {
    code: 'INVALID_DICTIONARY_INPUT',
    message: '字典项信息不完整',
  })
  if (!requestBody.isValid) return requestBody.response
  const input = requestBody.body
  const entryValue = input.value.trim()
  if (
    dictionaryEntries.some(
      (candidate) =>
        candidate.id !== dictionaryEntry.id &&
        candidate.typeId === dictionaryEntry.typeId &&
        candidate.value === entryValue,
    )
  ) {
    return getInputFailure('字典值已存在', 'DICTIONARY_VALUE_EXISTS', 409)
  }

  dictionaryEntry.label = input.label.trim()
  dictionaryEntry.value = entryValue
  dictionaryEntry.color = input.color
  dictionaryEntry.order = input.order
  dictionaryEntry.status = input.status
  return HttpResponse.json<ApiResponse<DictionaryEntry>>({
    code: 0,
    message: 'updated',
    data: copyDictionaryEntry(dictionaryEntry),
  })
})

export const deleteDictionaryEntryHandler = http.delete<{ dictionaryEntryId: string }>(
  '/api/dictionaries/entries/:dictionaryEntryId',
  ({ params, request }) => {
    const authentication = authorizeMockPermission(request, 'delete', 'Settings')
    if (!authentication.isAuthenticated) return authentication.response

    const dictionaryEntry = findDictionaryEntry(params.dictionaryEntryId)
    if (!dictionaryEntry) return getInputFailure('字典项不存在', 'DICTIONARY_ENTRY_NOT_FOUND', 404)
    dictionaryEntries.splice(dictionaryEntries.indexOf(dictionaryEntry), 1)
    return HttpResponse.json<ApiResponse<null>>({ code: 0, message: 'deleted', data: null })
  },
)

export const dictionaryOptionsHandler = http.get<{ code: string }>(
  '/api/dictionaries/options/:code',
  ({ params, request }) => {
    const authentication = authenticateMockRequest(request)
    if (!authentication.isAuthenticated) return authentication.response

    const dictionaryType = dictionaryTypes.find((candidate) => candidate.code === params.code)
    if (!dictionaryType || dictionaryType.status === 'disabled')
      return getInputFailure('字典类型不存在或已停用', 'DICTIONARY_TYPE_NOT_FOUND', 404)

    // AI modified: consumers receive a stable option projection without management identifiers.
    const options = dictionaryEntries
      .filter((entry) => entry.typeId === dictionaryType.id)
      .sort((leftEntry, rightEntry) => leftEntry.order - rightEntry.order)
      .map((entry) => ({
        label: entry.label,
        value: entry.value,
        color: entry.color,
        isDisabled: entry.status === 'disabled',
      }))
    return HttpResponse.json<ApiResponse<DictionaryOptionResponse>>({
      code: 0,
      message: 'success',
      data: { code: dictionaryType.code, options },
    })
  },
)

export const dictionaryHandlers = [
  listDictionaryTypesHandler,
  createDictionaryTypeHandler,
  updateDictionaryTypeHandler,
  deleteDictionaryTypeHandler,
  listDictionaryEntriesHandler,
  createDictionaryEntryHandler,
  updateDictionaryEntryHandler,
  deleteDictionaryEntryHandler,
  dictionaryOptionsHandler,
]
