import { validateRuntimeConfig } from '@/config/runtime-config-schema'

export const TEST_RUNTIME_CONFIG = validateRuntimeConfig({
  schemaVersion: 1,
  api: { baseUrl: '/api' },
  notifications: { url: null, allowedOrigins: [] },
  navigation: { externalOrigins: [], iframeOrigins: [] },
})
