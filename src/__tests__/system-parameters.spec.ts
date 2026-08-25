import type {
  SystemParameterInput,
  SystemParameterRecord,
} from '@/features/system-parameters/types'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createSystemParameter,
  deleteSystemParameter,
  listSystemParameters,
  updateSystemParameter,
} from '@/features/system-parameters/api'
import SystemParametersTable from '@/features/system-parameters/components/SystemParametersTable.vue'
import { i18n, setLocale } from '@/i18n'
import { del, get, post, put } from '@/lib/http'
import { generateMockToken } from '@/mocks/data/users'
import { resetMockSystemParameters } from '@/mocks/handlers/system-parameters'
import router from '@/router'

const parameterInput: SystemParameterInput = {
  key: 'feature.customer_portal_enabled',
  value: 'true',
  description: 'Enables the customer portal entry point.',
  status: 'active',
}

describe('system parameter management', () => {
  beforeEach(() => {
    resetMockSystemParameters()
    setLocale('en-US')
    localStorage.removeItem('auth_token')
    sessionStorage.setItem('auth_token', generateMockToken(1))
  })

  afterEach(() => {
    localStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_token')
  })

  it('filters the protected list by keyword and status', async () => {
    const response = await listSystemParameters({ keyword: 'password', status: 'active' })

    expect(response.total).toBe(1)
    expect(response.items[0]?.key).toBe('security.password_expiry_days')
  })

  it('creates, updates, rejects duplicate keys, and deletes a parameter', async () => {
    const createdParameter = await createSystemParameter(parameterInput)
    expect(createdParameter).toMatchObject(parameterInput)

    const updatedParameter = await updateSystemParameter(createdParameter.id, {
      ...parameterInput,
      value: 'false',
      status: 'disabled',
    })
    expect(updatedParameter).toMatchObject({ value: 'false', status: 'disabled' })

    await expect(createSystemParameter(parameterInput)).rejects.toMatchObject({
      code: 'SYSTEM_PARAMETER_KEY_EXISTS',
      status: 409,
    })

    await deleteSystemParameter(createdParameter.id)
    const remainingParameters = await listSystemParameters({
      keyword: parameterInput.key,
      status: 'all',
    })
    expect(remainingParameters.total).toBe(0)
  })

  it('enforces Settings permission for every read and write endpoint', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(2))

    await expect(get('/system-parameters')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
    await expect(post('/system-parameters', parameterInput)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
    await expect(put('/system-parameters/parameter-1', parameterInput)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
    await expect(del('/system-parameters/parameter-1')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
  })

  it('registers under the existing system configuration route and hides mutation actions when read-only', () => {
    expect(router.resolve('/system-config/parameters').name).toBe('system-parameters')

    const parameter: SystemParameterRecord = {
      id: 'parameter-safe-render',
      key: 'security.banner_text',
      value: '<script>alert(1)</script>',
      description: 'Escaped text boundary.',
      status: 'active',
      updatedAt: '2026-07-13T08:00:00.000Z',
    }
    const wrapper = mount(SystemParametersTable, {
      props: {
        parameters: [parameter],
        isLoading: false,
        isDeleting: false,
        canUpdate: false,
        canDelete: false,
      },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toContain('<script>alert(1)</script>')
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Edit parameter"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Delete"]').exists()).toBe(false)
  })
})
