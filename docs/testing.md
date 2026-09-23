# Testing and release evidence

Status: Implemented skeleton gate.

`pnpm run check` runs TypeScript, ESLint, documentation, runtime-config and sensitive-file checks. `pnpm run verify` adds toolchain diagnostics, unit coverage, the production audit, and a standard build. `pnpm run release:check` runs three-browser starter/recovery tests, a Base-scoped Chromium PWA test, and restores a standard production `dist`.

```sh
pnpm install --frozen-lockfile
pnpm run release:check
```

The unit suite covers the closed public configuration schema. Browser tests cover public startup without a backend and recovery from an invalid configuration. PWA tests cover worker scope and that runtime configuration/API responses are not precached. CI also builds a hardened container and probes standalone health plus optional API proxy behavior.

Do not carry forward old business test counts, screenshots, or Mock-only gates. New features require tests for their own behavior and published API contracts.
