# Rollback

Status: Reference procedure.

Restore the previous immutable frontend artifact and its matching `runtime-config.json`. For container deployments, restore the previous image digest and its environment settings together. Check `/healthz`, `/readyz`, and the public home page after rollback.

A PWA client may retain an older static shell briefly. The worker uses a versioned cache namespace and the startup boundary removes workers from an incompatible mode. Runtime configuration is never precached; restore it independently from the static assets.

There is no frontend-owned database or production business data in this skeleton.
