# Page state and URL contract

<!-- AI modified: state coverage is an applicability matrix, not a requirement to render every state on every page. -->

## Typed page-state taxonomy

`src/components/admin/page-state.ts` is the shared vocabulary. `PageStatePanel` renders domain copy and recovery controls; `AsyncState` remains the smaller query-slot boundary for Loading, Empty, Error, and ready content. The interactive matrix is available at `/components/patterns` under **Page states**.

| State                    | Shared owner                                                        | Applicable evidence                                                         | Recovery policy                                                                 |
| ------------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Ready                    | Page or region                                                      | Every successful Vue Query projection                                       | Continue in place                                                               |
| Initial Loading          | `AsyncState`, table skeletons, or `PageStatePanel`                  | Dashboard, System Config, Monitoring, Dictionary, Table Gallery             | No action while the first request is pending                                    |
| Local Refresh            | Page-owned `isFetching` state                                       | Users refresh, Monitoring refresh, System Config refresh                    | Preserve previous content and disable duplicate action                          |
| Empty                    | `EmptyState`, `AsyncState`, or table empty row                      | Announcement, file, dictionary, message, and table collections              | Optional create action only when the actor can create                           |
| Search Empty             | Filter owner plus `EmptyState` or table empty row                   | Users, operation logs, files, component catalog                             | Clear or revise filters; do not label as an API error                           |
| API Error                | Vue Query error plus `AsyncState` / `PageStatePanel`                | Dashboard, Monitoring, System Config, Dictionary, operation-log list/detail | Retry the failed query without clearing valid session state                     |
| Fatal Application Error  | Root `ApplicationErrorBoundary` and application-recovery state      | Vue render, router navigation, Vite preload, and bootstrap boundaries       | Manually reload the application; never render diagnostics or auto-refresh       |
| Offline                  | Global `NetworkStatus`                                              | Shell-wide connectivity banner and restored toast                           | Reconnect, then retry the affected query; pages do not duplicate the banner     |
| Forbidden                | Router guard, request policy, and `ForbiddenPage`                   | Unauthorized direct route and backend `403`                                 | Return to a safe route; frontend hiding never replaces server authorization     |
| Conflict                 | Mutation owner plus typed `409` handling                            | Form validation examples and conflict Mock contracts                        | Reload server version and/or review differences in the originating form context |
| Submit Success / Failure | Mutation owner and actionable toast or field error                  | CRUD forms and operational actions                                          | Success confirms outcome; failure preserves input and exposes retry/correction  |
| Partial Success          | Mutation owner with result details                                  | Users CSV import and upload lifecycle                                       | Preserve successful rows and expose failed-row details                          |
| Session Expired          | HTTP request policy, auth store, router, and session-state boundary | `401` invalidation and login redirect with `redirect=<current fullPath>`    | Clear protected Query state, sign in again, then restore the requested URL      |

Page owners compose only applicable states. For example, a read-only list has no “partial success” state until it owns a batch mutation, and a page does not render a second offline banner because connectivity is global.

## URL state allowlist

`useAllowedUrlState` accepts only fixed literal states or a reactive server-provided identifier allowlist. It rejects multi-valued string ambiguity, drops unknown list entries, removes defaults from the URL, preserves unrelated query keys, and restores reused route instances during browser Back/Forward navigation. List state can use an explicit allowlisted control token for an empty selection (the Table tree uses `none`).

<!-- AI modified: URL-owned controls update one logical admin tab instead of multiplying tabs or remounting the page. -->

When a query-only navigation keeps the same route name, the active admin Tab retains its stable ID and cached component instance while its `fullPath` is updated. This preserves local state and Back/Forward behavior without opening a same-title Tab for every filter change. Explicitly opened tabs with distinct IDs can still own separate query-specific instances.

| Route surface                     | Query key        | Accepted state                                       | Default / safety behavior                                       |
| --------------------------------- | ---------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| Content Admin tab                 | `contentTab`     | `announcements`, `files`, `operation-logs`           | `announcements`; unknown values are removed                     |
| Operation Log detail Drawer       | `operationLog`   | IDs returned by the current operation-log response   | No Drawer; arbitrary identifiers never trigger a detail request |
| Monitoring tab                    | `monitoringTab`  | `sessions`, `logs`, `services`, `jobs`, `caches`     | `sessions`                                                      |
| System Config tab                 | `configSection`  | `site`, `upload`, `sms`, `email`, `third-party`      | `site`                                                          |
| Dictionary type/category          | `dictionaryType` | IDs returned by the current dictionary-type response | First server-ordered type; deleted/unknown IDs advance safely   |
| Table Gallery group               | `tableGroup`     | `foundations`, `interaction`, `scale`, `resilience`  | `foundations`                                                   |
| Table Gallery expanded tree nodes | `tableTree`      | The three known expandable fixture IDs or `none`     | Finance and ledger branches expanded                            |

The Users server table retains the separate `useTableUrlState` contract for page, page size, filters, and sorting. Gallery keys use `tableGroup` and `tableTree`, so they do not collide with the server-pagination example’s `page`, `pageSize`, `sortBy`, `sortOrder`, and filter keys.

## Verification responsibilities

- Unit tests validate allowlist decoding, default omission, unrelated-query preservation, list deduplication, explicit empty state, and Back/Forward restoration.
- Component tests validate assertive failure announcements, busy progress, native recovery events, and Gallery recovery.
- Page and E2E tests should assert the visible tab/tree/Drawer together with the URL; checking only `route.query` is insufficient.
