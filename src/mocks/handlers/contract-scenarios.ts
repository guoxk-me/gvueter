import type { ApiEnvelope } from '@/lib/http'
import { delay, http, HttpResponse } from 'msw'

export const CONTRACT_FAILURE_SCENARIOS = [
  'unauthorized',
  'forbidden',
  'conflict',
  'validation',
  'server-error',
] as const

export type ContractFailureScenario = (typeof CONTRACT_FAILURE_SCENARIOS)[number]

const failureResponses: Record<
  ContractFailureScenario,
  {
    code: string
    message: string
    status: 401 | 403 | 409 | 422 | 500
  }
> = {
  'unauthorized': { code: 'TOKEN_EXPIRED', message: 'The session has expired', status: 401 },
  'forbidden': { code: 'FORBIDDEN', message: 'The operation is not permitted', status: 403 },
  'conflict': {
    code: 'VERSION_CONFLICT',
    message: 'The resource changed on the server',
    status: 409,
  },
  'validation': { code: 'VALIDATION_FAILED', message: 'Review the highlighted fields', status: 422 },
  'server-error': {
    code: 'INTERNAL_ERROR',
    message: 'The service could not complete the request',
    status: 500,
  },
}

function isContractFailureScenario(value: string): value is ContractFailureScenario {
  return (CONTRACT_FAILURE_SCENARIOS as readonly string[]).includes(value)
}

const delayedContractHandler = http.get('/api/contract-scenarios/delay', async () => {
  await delay(40)
  return HttpResponse.json<ApiEnvelope<{ delayed: true }>>(
    {
      code: 0,
      message: 'success',
      data: { delayed: true },
    },
    {
      headers: { 'X-Request-ID': 'mock-delay-request' },
    },
  )
})

const timeoutContractHandler = http.get('/api/contract-scenarios/timeout', async () => {
  // AI modified: a finite delayed response lets clients verify their own timeout budget without hanging tests.
  await delay(120)
  return HttpResponse.json<ApiEnvelope<{ delayed: true }>>(
    {
      code: 0,
      message: 'success',
      data: { delayed: true },
    },
    {
      headers: { 'X-Request-ID': 'mock-timeout-request' },
    },
  )
})

const failedContractHandler = http.get<{ scenario: string }>(
  '/api/contract-scenarios/failures/:scenario',
  ({ params }) => {
    if (!isContractFailureScenario(params.scenario)) {
      return HttpResponse.json<ApiEnvelope<null>>(
        {
          code: 'SCENARIO_NOT_FOUND',
          message: 'The requested failure scenario is unknown',
          data: null,
        },
        {
          status: 404,
          headers: { 'X-Request-ID': 'mock-unknown-scenario' },
        },
      )
    }

    const failure = failureResponses[params.scenario]
    const details
      = params.scenario === 'validation'
        ? { fieldErrors: { email: ['Enter a valid business email address'] } }
        : null
    return HttpResponse.json<ApiEnvelope<typeof details>>(
      {
        code: failure.code,
        message: failure.message,
        data: details,
      },
      {
        status: failure.status,
        headers: { 'X-Request-ID': `mock-${params.scenario}-request` },
      },
    )
  },
)

export const contractScenarioHandlers = [
  delayedContractHandler,
  timeoutContractHandler,
  failedContractHandler,
]
