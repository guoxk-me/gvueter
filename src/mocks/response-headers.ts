// AI modified: sensitive Mock responses share one cache policy so new auth and operations surfaces cannot drift.
export const NO_STORE_RESPONSE_HEADERS = { 'Cache-Control': 'no-store' } as const
