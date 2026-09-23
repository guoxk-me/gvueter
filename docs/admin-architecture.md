# Frontend architecture

Status: Implemented skeleton; backend integration remains planned.

The startup path validates `runtime-config.json` before Vue mounts, configures a shared Axios client, reconciles the optional PWA worker, then installs Vue Router, Pinia, Vue Query, and i18n. The only route is a public starter page. A route-access callback and optional access-token provider are the retained extension points for future authentication.

`src/components/ui` contains official shadcn-vue primitives. The old admin composite, table framework, appearance system, and business feature modules were removed. The stylesheet keeps only the neutral variables needed by the primitives; no theme switcher or user-specific appearance state runs.

On 2026-09-23, all 65 installed UI component groups were compared file by file with the current `@shadcn/*` registry returned by shadcn-vue CLI 2.8.2. Of 430 registry source files, 340 match locally after quote, whitespace, and registry import-path differences are ignored. The other 90 have local behavior or markup differences; examples include button accessibility, chart lifecycle, toast wrapping, and calendar navigation. `chart-context.ts` is one additional local support file required by the installed chart primitive. Some upstream snippets contain bare CSS tokens where the local source has valid strings, so wholesale replacement would break type checking. No registry source was overwritten in this cleanup. Recheck each differing primitive with its consumers before adopting a future registry change.

The retained frontend source has these responsibilities:

- `src/config`: closed public runtime configuration and startup recovery.
- `src/lib/http.ts`: API base URL, request ID, and optional credential hook.
- `src/router`: public route and optional access policy hook.
- `src/i18n`: small starter/PWA copy.
- `src/features/pwa`: optional install/update lifecycle and network-only API/config boundary.
- `src/pages/HomePage.vue`: deployment-visible, backend-independent entry point.

New business code should be added as a separate feature after its gnester-lite API contract is known. Never infer authorization from the frontend guard alone.
