# Performance contract

`src/lib/performance-budget.json` is the single machine-readable budget shared by runtime choices, tests, the bundle gate, and this document.

## Runtime thresholds

| Area                |                  Budget | Application rule                                                                                                                                                                      |
| ------------------- | ----------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Table rows          |                200 rows | Enable `ProTable` virtualization at or before this in-memory row count. Server-paginated tables still paginate instead of downloading an unbounded result.                            |
| Tree nodes          | 100 visible/known nodes | Prefer `TreeView` `hasChildren` + `loadChildren`; do not eagerly fetch every descendant. Loading, failure, retry, `aria-busy`, and stale-root cache release are part of the contract. |
| KeepAlive           |  20 component instances | `AdminRouteOutlet` imports the shared limit. Closing tabs, permission loss, principal changes, and route disposal release stale entries and related Vue Query data.                   |
| First useful screen |                2,500 ms | Production RUM p75 target on the agreed reference device/network. Skeletons do not count as useful content.                                                                           |
| Route transition    |                  250 ms | p75 route ownership change including lazy chunk and primary data readiness; long operations need progressive state.                                                                   |
| Interaction         |                  100 ms | p75 input-to-visible-feedback target; expensive filtering/search must debounce, cancel, or move off the blocking path.                                                                |

Searchable remote examples debounce input, abort superseded requests, guard the latest result, and clean up on unmount. Server Table examples apply the same cancellation and race-ownership rule. Large lists use TanStack virtualization instead of mounting every row.

## JavaScript delivery

- Initial entry chunks are limited to 85 KiB gzip each.
- Lazy/vendor/feature chunks are limited to 110 KiB gzip each.
- Vite emits `dist/.vite/manifest.json`; `scripts/check-bundle-budget.mjs` resolves real entry ownership, gzips every emitted JavaScript asset, and fails the build on regression.
- Rich text, Markdown/code/JSON editors, component modules, charts, and other feature routes stay dynamically imported. A budget pass does not permit moving a heavy feature into the initial route.

The thresholds are regression budgets, not a claim that every device downloads the sum of all chunks. When a justified dependency exceeds a limit, split or replace it first; changing the budget requires a measured reference trace and a documented decision.

## Charts and hidden content

`@/components/ui/chart` is the only business-facing provider entry and exposes the approved Line, Bar, and Donut surface through direct Unovis subpaths. `check:charts` rejects direct provider imports and map renderers in source; the production bundle gate also rejects map signatures in emitted JavaScript.

`ChartContainer` observes positive container bounds, coalesces resize work to one animation frame, and exposes a `revision` slot value. Dashboard and Gallery Unovis containers key themselves by that revision so a chart hidden by a Tab, restored from KeepAlive, resized by the Shell, or affected by theme/Locale changes redraws with current geometry. Observers, visibility listeners, fallback resize listeners, and pending frames are released on unmount. Every business chart still owns a screen-reader/table alternative and its loading/empty/error states.

## Verification

```sh
pnpm run check:charts
pnpm exec vitest run src/__tests__/performance-contract.spec.ts src/__tests__/chart-lifecycle.spec.ts
pnpm run build
```

Build output proves asset budgets. Browser E2E and production RUM are required for first-screen, transition, and interaction percentiles; unit tests cannot prove wall-clock user experience.

<!-- AI modified: chart acceptance now includes the stable provider boundary, map exclusion, theme/Locale refresh, cleanup, accessibility, and bundle evidence. -->
