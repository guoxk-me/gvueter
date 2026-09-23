# Progressive Web App

Status: Implemented optional build capability.

Set `VITE_ENABLE_PWA=true` to emit the install manifest and `pwa-sw.js`. The default production build has PWA disabled. `VITE_BASE_PATH` scopes the worker, manifest, assets, and navigation fallback to one application path.

The worker precaches the static shell. API and `runtime-config.json` requests stay network-only so an old deployment setting or backend response is never served from the application cache. The install/update prompt remains in `src/features/pwa`. A previously installed legacy worker is removed during startup before the new worker takes control.

The release gate builds at `/admin/` and verifies worker scope in Chromium, then restores the standard build at `/`.
