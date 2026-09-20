# Testing and visual acceptance

This repository treats unit, component, integration, browser-flow, and visual checks as complementary evidence. A visible container alone is never sufficient proof for layout or workflow behavior.

<!-- AI modified: keep the executable quality baseline and acceptance matrix in one release-facing document. -->

## Required release gates

Run from the repository root with the pnpm-managed toolchain:

On a new machine, install the browser runtimes once with `pnpm exec playwright install chromium firefox webkit`.

<!-- quality-commands:start -->
- `pnpm run verify` runs the reproducible PR and local quality gate.
- `pnpm run release:check` adds the Mock build, three-browser E2E, and guaranteed production artifact restoration.
<!-- quality-commands:end -->

<!-- AI modified: the typed release runner owns environment flags and always restores the deployable artifact. -->

Run `pnpm install --frozen-lockfile` first. `verify` performs the read-only CI diagnosis, TypeScript/ESLint, documentation, contract, security, inventory, production audit, coverage, and production build gates. `release:check` runs `verify`, creates the isolated Mock test build, executes all three Playwright engines, and restores a non-Mock production `dist` even when a browser check fails.

<!-- AI modified: ESLint is the one formatting and semantic gate for supported source and documentation files. -->

`pnpm run check` combines non-mutating `vue-tsc --build` coverage for the app, tests, configuration, and Playwright projects with Antfu ESLint formatting and semantic rules. It also checks Chart and Feature source boundaries, Locale Key/placeholder parity, and production-source isolation. Use `pnpm run format` or `pnpm run lint:fix` for mechanical fixes. Husky and lint-staged provide fast staged-file feedback, but do not replace the required check. CSS and standalone HTML keep their existing style without a mechanical formatter.

The contract gate compares every literal MSW API path with `docs/openapi.yaml` in both directions, requires the OpenAPI/package versions to match, checks generated DTO drift and the owned API-binding plan, requires every Mock JSON reader to use an executable request schema, requires every JSON OpenAPI request body to resolve to a closed domain object, and rejects production request calls that bypass an explicit runtime response schema. Binary media types and download headers are checked separately. Knip blocks dependency/resolution/cycle failures immediately and new or expired file/export/type debt against the exact baseline. The license gate inventories direct and transitive production/development packages and requires each license to be allowed, denied or covered by an unexpired owned review. The sensitive-file gate rejects private-key files and common credential signatures without sending source to an external service. The production dependency audit fails on high or critical advisories; the container CI job also publishes an SPDX JSON SBOM of the production image.

`pnpm run test:inventory` is a regression floor for spec files, declared tests, and direct feature references; it complements, but does not replace, execution coverage. `pnpm run test:coverage` runs the unit suite with the matching V8 provider and fails below the configured statement, branch, function, or line thresholds. Keep both gates: inventory catches deleted suites and feature-reference drift, while coverage measures executed production code. CI retains failed PR evidence for 14 days and main-branch evidence for 30 days.

The catalog keeps Vitest and `@vitest/coverage-v8` on the same exact stable version. Treat changes to Vite, Vitest, the coverage provider, TypeScript, or ESLint as coordinated toolchain migrations followed by this entire release matrix.

<!-- AI modified: artifact verification covers both performance and the production Mock boundary. -->

The plain build is the deployable production artifact and includes the production bundle-budget gate. That gate also rejects a real browser-Mock entry or `mockServiceWorker.js` in a non-Mock `dist`; the production alias retains only a typed no-op boundary. The Mock-enabled build validates that its handler entry and worker exist while skipping production size budgets because it is only a deterministic browser fixture; it overwrites `dist` locally and must never be deployed. Re-run `VITE_ENABLE_MOCKS=false pnpm run build` before publishing from the same workspace.

## Evidence layers

| Layer                         | Evidence                                                                                             | Typical location                                                |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Rules and utilities           | deterministic inputs, boundary values, authorization and state contracts                             | `src/__tests__/*.spec.ts`                                       |
| Component interaction         | emitted state, accessible names, focus, keyboard, Loading/Empty/Error and cleanup                    | `src/__tests__/*.spec.ts`                                       |
| Page and API composition      | Vue Query/MSW request parameters, response rows, permissions and recovery                            | `src/__tests__/*.spec.ts`                                       |
| Core browser flows            | login/session, CRUD/import/bulk actions, Table, Form, permissions, menu/iframe and mobile operations | `e2e/vue.spec.ts`, `e2e/admin-core-flows.spec.ts`               |
| Component browser flows       | cached-route continuity, schema multipart file bytes and representative module interactions          | `e2e/component-modules.spec.ts`                                 |
| Release failure recovery      | canceled Vite preload events, private diagnostics, manual reload, and an unavailable emitted chunk   | `e2e/release-recovery.spec.ts`                                  |
| Shell and responsive behavior | measurable overflow, overlap, boundaries, navigation reachability, focus, themes and motion          | `e2e/shell-navigation.spec.ts`                                  |
| Visual regression             | stable component pages and 150% copy expansion                                                       | `e2e/component-modules.spec.ts`, `e2e/long-text-visual.spec.ts` |

PR runs Ubuntu `verify` and Chromium Smoke in parallel. Trusted `main` and transitional `main-admin` pushes, manual runs, and Monday 02:00 UTC schedules run Windows verification, the full Chromium/Firefox/WebKit suite, and container checks; Chromium is not duplicated in a second trusted-run job. Scheduled runs use the default branch. Node `24.18.0` and packageManager-pinned pnpm `12.4.1` are installed by the official SHA-pinned `pnpm/setup` action. Chromium remains the only pixel-baseline engine; Firefox and WebKit exclude the two visual-regression specifications so engine-specific text rasterization cannot rewrite shared baselines. A retry is diagnostic only: `failOnFlakyTests` makes any retry-pass fail CI. HTML, JUnit, trace, screenshot, and retained-failure video evidence is retained for 14 days on PRs and 30 days on trusted runs.

<!-- AI modified: Doctor validates all present environment modes without logging values; host-specific hints are non-blocking. -->

Doctor checks the exact runtime baseline and both pnpm 12 lockfile documents, dependency/catalog/override consistency, and declarations in `env.d.ts`. Present `.env`, `.env.local`, development/test/production and their `.local` variants are inspected. Undeclared variables, browser-visible secret naming, invalid boolean/URL/origin configuration, and effective production Mock inherited from shared files fail the gate. Output contains only file/variable names and issue types, never environment values. Development-only Mock remains valid; a shared Mock setting requires an explicit production override. Optional browser availability and occupied development ports warn only. CI omits those host-specific hints.

<!-- AI modified: recovery evidence separates portable browser behavior from deterministic fault injection. -->

The Vite preload-event recovery path runs in all three engines. Chromium and WebKit additionally take the browser offline before opening an emitted route that has not loaded, proving the production lazy-chunk path rather than only dispatching an event. Firefox eagerly caches that fixture route in this matrix, so it runs the portable event case and excludes only the non-deterministic network-injection case.

Pagination coverage must assert the visible range/total, outgoing page and page-size parameters, rendered row count, clamped page, selection policy, and previous/next disabled states together. Layout coverage measures document/main overflow, header collisions, boundary ownership, menu reachability, and focus restoration rather than only checking visibility.

<!-- AI modified: browser readiness follows observable application state instead of transport idleness. -->

For asynchronous bootstrap, navigation waits for document commit and then for the owned UI or API boundary that proves the scenario is usable. Do not use URL arrival, the browser `load` event, or `networkidle` alone as application readiness: Runtime Config, MSW, routing, and Vue mounting continue independently. History tests must let the destination Shell mount before navigating away again, and API consequence tests synchronize on the owned response before asserting the resulting route or UI.

## Acceptance matrices

- Shell: three formal layouts × `zh-CN`/`en-US` × 390/768/1024/1280/1440, with 1920/2560 wide-screen samples before release.
- Sidebar: applicable layouts × expanded/collapsed × one/two/three/four menu levels.
- Top navigation: `zh-CN`/`en-US` × 1024/1280/1440, including full → More and mobile navigation degradation.
- Content expansion: representative pages and component modules at 100% and synthetic 150% copy.
- Motion: normal and `prefers-reduced-motion` across route, Sheet, Sidebar, and View Transition.
- Appearance: light/dark/system × approved brand presets, plus observable targets for every applicable setting; DataTable density is verified locally rather than as a global UI mode.
- Boundary smoke: 320px and 1920px complement, but do not replace, the five-width core matrix.

## Deterministic visual policy

- MSW fixtures are deterministic and cover Chinese/English text, long/empty/invalid values, boundary dates, Asia/Shanghai display time, money, percentages and large lists.
- Playwright fixes the browser baseline to `en-US`, `Asia/Shanghai` and a light color preference; visual and motion cases explicitly emulate normal/reduced motion and override locale/theme through the same persisted settings used by the app.
- Inter is bundled locally. Visual helpers wait for all used weights and two animation frames before capture.
- Visual cases fix the clock, disable animations/carets, hide transient tooling/toasts where appropriate, and mask nondeterministic canvas/chart/iframe regions.
- Persisted theme/density reload tests must wait for a visible Shell before changing settings as well as after the real reload. A document load/commit alone does not establish Mock/Vue readiness; interrupting Worker installation is a different scenario from changing appearance on an available application.
- The repository screenshot ceiling is `maxDiffPixelRatio: 0.01`; the long-text regression uses the stricter `0.005`. Chromium baselines are isolated by operating system under `<spec>-snapshots/{platform}/` (`darwin` for macOS, `linux` for Ubuntu CI); neither platform may overwrite the other's rendering evidence.
- Each supported baseline platform contains 20 active images. Updates require explicit authorization and individual visual review, followed by running the affected suites without `--update-snapshots` and with `--retries=0`. Linux capture uses the repository-pinned Node, pnpm, and Playwright versions in Ubuntu 24.04; CI must never regenerate expected screenshots automatically. Existing geometry, behavior, and flaky-test gates remain mandatory.
- Snapshot updates require inspecting the rendered images and confirming the corresponding geometry assertions still pass; a bulk baseline rewrite is not acceptance evidence.

## Failure handling

Reproduce a failed gate at the narrowest relevant layer, fix the shared contract, and then rerun both the narrow check and its parent gate. Retries are diagnostic protection for browser infrastructure, not a way to accept a consistently failing assertion. Never mark a roadmap item complete while its required verification remains red or was not executed.

## Accessibility and zoom release evidence

Automated assertions cover accessible names, keyboard/focus behavior, reduced motion, responsive overflow, and long-copy expansion. Before a production release, record a manual result for each applicable row; an unchecked row is a release exception, not an assumed pass.

| Surface       | Required environment                              | Acceptance                                                                                                 |
| ------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Keyboard      | Chromium, Firefox, and WebKit at 100%             | All actions are reachable, focus is visible, dialogs trap/restore focus, and no keyboard trap exists.      |
| Browser zoom  | Chromium and Firefox at 200% on a 1280px viewport | No two-dimensional page scroll, clipped action, or content loss; reflow remains usable.                    |
| Mobile zoom   | Safari/iOS or equivalent device at 200%           | Text zoom does not hide navigation, form errors, or primary actions.                                       |
| Screen reader | VoiceOver + Safari on macOS                       | Landmarks, headings, controls, live status, table context, and validation errors are announced coherently. |
| Screen reader | NVDA + Firefox or Chrome on Windows               | The same navigation, form, table, dialog, and error journeys complete without pointer input.               |

Store the release SHA, date, OS/browser/assistive-technology versions, tested journeys, result, and issue links in the release record. Browser automation cannot substitute for the two screen-reader rows or real browser zoom.
