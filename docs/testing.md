# Testing and visual acceptance

This repository treats unit, component, integration, browser-flow, and visual checks as complementary evidence. A visible container alone is never sufficient proof for layout or workflow behavior.

<!-- AI modified: keep the executable quality baseline and acceptance matrix in one release-facing document. -->

## Required release gates

Run from the repository root with the Vite+ toolchain:

On a new machine, install the browser runtimes once with `vp exec playwright install chromium firefox webkit`.

```sh
vp install --frozen-lockfile
vp check
vp run check
vp run check:contracts
vp run check:security
vp run test:inventory
vp pm audit --production --level high
vp run test:coverage
vp run build
VITE_ENABLE_MOCKS=true vp run build
CI=true VITE_ENABLE_MOCKS=true vp run test:e2e
VITE_ENABLE_MOCKS=false vp run build
```

`vp check` owns repository-wide Oxfmt formatting and Oxlint. `vp run check` adds non-mutating `vue-tsc --build` coverage for the app, tests, configuration, and Playwright projects, plus semantic Vue/TypeScript/pnpm/project ESLint rules. Oxfmt is the sole mechanical formatter, so formatting-equivalent ESLint rules are delegated to it; semantic rules remain active. Use `vp fmt . --write` (or `vp run format`) for formatting and `vp run lint:fix` only when an explicit modifying lint pass is intended. `vp staged` is a fast ESLint hook, not a replacement for either required check.

The contract gate compares every literal MSW API path with `docs/openapi.yaml` in both directions, requires the OpenAPI/package versions to match, requires every Mock JSON reader to use an executable request schema, requires every JSON OpenAPI request body to resolve to a closed domain object, and rejects production request calls that bypass an explicit runtime response schema. Binary media types and download headers are checked separately. The sensitive-file gate rejects private-key files and common credential signatures without sending source to an external service. The production dependency audit fails on high or critical advisories; the container CI job also publishes an SPDX JSON SBOM of the production image.

`vp run test:inventory` is a regression floor for spec files, declared tests, and direct feature references; it complements, but does not replace, execution coverage. `vp run test:coverage` runs the unit suite with the exact V8 provider required by the pinned test runtime and fails below the configured statement, branch, function, or line thresholds. Keep both gates: inventory catches deleted suites and feature-reference drift, while coverage measures executed production code. CI retains the generated coverage report for 14 days, including failed threshold runs when output exists.

<!-- AI modified: document the known pre-1.0 toolchain warning without weakening the executable gate. -->

[Vite+ is a pre-1.0 beta toolchain](https://viteplus.dev/guide/troubleshooting). The dependency catalog pins the local core/test packages to 0.1.19, while CI and Docker pin the global CLI to the same version. The npm-aliased test package declares `@vitest/coverage-v8` 4.1.4 as its peer, but its own package metadata remains versioned `0.1.19`. Vitest therefore emits a mixed-version warning even though the lockfile resolves the declared provider peer exactly. Treat the warning as a tracked toolchain limitation, not as permission to ignore coverage failures. Upgrade the Vite+ CLI, core alias, test alias, and coverage provider only as one reviewed migration followed by this entire release matrix.

<!-- AI modified: artifact verification covers both performance and the production Mock boundary. -->

The plain build is the deployable production artifact and includes the bundle-budget gate. That gate also rejects a real browser-Mock entry or `mockServiceWorker.js` in a non-Mock `dist`; the production alias retains only a typed no-op boundary. The Mock-enabled build exists only for deterministic browser verification; it overwrites `dist` locally and must never be deployed. Re-run `VITE_ENABLE_MOCKS=false vp run build` before publishing from the same workspace.

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

CI runs the behavioral suite in Chromium, Firefox, and WebKit. Chromium remains the only pixel-baseline engine; Firefox and WebKit exclude the two visual-regression specifications so engine-specific text rasterization cannot rewrite shared baselines. A retry is diagnostic only: `failOnFlakyTests` makes any retry-pass fail CI. HTML, JUnit, trace, screenshot, and retained-failure video evidence is uploaded for 14 days.

<!-- AI modified: recovery evidence separates portable browser behavior from deterministic fault injection. -->

The Vite preload-event recovery path runs in all three engines. Chromium and WebKit additionally take the browser offline before opening an emitted route that has not loaded, proving the production lazy-chunk path rather than only dispatching an event. Firefox eagerly caches that fixture route in this matrix, so it runs the portable event case and excludes only the non-deterministic network-injection case.

Pagination coverage must assert the visible range/total, outgoing page and page-size parameters, rendered row count, clamped page, selection policy, and previous/next disabled states together. Layout coverage measures document/main overflow, header collisions, boundary ownership, menu reachability, and focus restoration rather than only checking visibility.

## Acceptance matrices

- Shell: six layouts × `zh-CN`/`en-US` × 390/768/1024/1280/1440.
- Sidebar: applicable layouts × expanded/collapsed × one/two/three/four menu levels.
- Top navigation: `zh-CN`/`en-US` × 1024/1280/1440, including full → More and mobile navigation degradation.
- Content expansion: representative pages and component modules at 100% and synthetic 150% copy.
- Motion: normal and `prefers-reduced-motion` across route, Sheet, Sidebar, and View Transition.
- Appearance: light/dark × standard/compact, plus observable targets for every applicable setting.
- Boundary smoke: 320px and 1920px complement, but do not replace, the five-width core matrix.

## Deterministic visual policy

- MSW fixtures are deterministic and cover Chinese/English text, long/empty/invalid values, boundary dates, Asia/Shanghai display time, money, percentages and large lists.
- Playwright fixes the browser baseline to `en-US`, `Asia/Shanghai` and a light color preference; visual and motion cases explicitly emulate normal/reduced motion and override locale/theme through the same persisted settings used by the app.
- Inter is bundled locally. Visual helpers wait for all used weights and two animation frames before capture.
- Visual cases fix the clock, disable animations/carets, hide transient tooling/toasts where appropriate, and mask nondeterministic canvas/chart/iframe regions.
- The repository screenshot ceiling is `maxDiffPixelRatio: 0.01`; the long-text regression uses the stricter `0.005`. Baselines are shared across Chromium CI and local runs through the configured snapshot path.
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
