import type {
  SystemParameterInput,
  SystemParameterListFilters,
  SystemParameterListResponse,
  SystemParameterRecord,
} from './types'
import { EMPTY_RESPONSE_SCHEMA } from '@/lib/api-contracts'
import { del, get, post, put } from '@/lib/http'
import {
  SYSTEM_PARAMETER_LIST_RESPONSE_SCHEMA,
  SYSTEM_PARAMETER_RECORD_SCHEMA,
} from './system-parameter-api-contracts'

export function listSystemParameters(
  filters: SystemParameterListFilters,
): Promise<SystemParameterListResponse> {
  return get<SystemParameterListResponse>(
    '/system-parameters',
    {
      keyword: filters.keyword.trim() || undefined,
      status: filters.status === 'all' ? undefined : filters.status,
    },
    {
      responseSchema: SYSTEM_PARAMETER_LIST_RESPONSE_SCHEMA,
    },
  )
}

export function createSystemParameter(input: SystemParameterInput): Promise<SystemParameterRecord> {
  return post<SystemParameterRecord>('/system-parameters', input, {
    responseSchema: SYSTEM_PARAMETER_RECORD_SCHEMA,
  })
}

export function updateSystemParameter(
  parameterId: string,
  input: SystemParameterInput,
): Promise<SystemParameterRecord> {
  return put<SystemParameterRecord>(`/system-parameters/${parameterId}`, input, {
    responseSchema: SYSTEM_PARAMETER_RECORD_SCHEMA,
  })
}

export function deleteSystemParameter(parameterId: string): Promise<null> {
  return del<null>(`/system-parameters/${parameterId}`, {
    responseSchema: EMPTY_RESPONSE_SCHEMA,
  })
}
