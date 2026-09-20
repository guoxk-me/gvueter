import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  // AI modified: the worker and Vite's conditional Mock stub are independent build entry points.
  entry: ['src/features/pwa/pwa-sw.ts', 'src/mocks/browser-disabled.ts'],
  // AI modified: Antfu ESLint needs this direct peer even though no source imports it explicitly.
  ignoreDependencies: ['@typescript-eslint/rule-tester'],
  // AI modified: schema-generated symbols are governed by api:check rather than unused-export cleanup.
  ignoreIssues: { 'src/types/openapi-generated.ts': ['exports', 'types'] },
}

export default config
