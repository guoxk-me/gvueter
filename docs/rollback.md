# Rollback guide

## Rollback triggers

Rollback the frontend when a new release causes a security boundary regression, cross-tenant state exposure, sign-in/navigation failure, broken core mutation, persistent blank page/chunk failure, or a material error-rate increase. An unchanged upstream outage is not fixed by frontend rollback; use `/readyz` and backend telemetry to distinguish it first.

## Procedure

1. Stop promotion and record the affected release SHA, image digest, start time, symptoms, and correlation IDs.
2. Verify the previous image digest is the last known healthy artifact and uses a backend-compatible API contract.
3. Redeploy that exact digest; do not rebuild an old Git ref because base images and registries can change.
4. Keep the same approved runtime CSP values unless the incident is caused by an origin-policy change. Never broaden CSP as an emergency workaround.
5. Purge or revalidate cached `index.html`; retain fingerprinted assets long enough for clients still holding either HTML version.
6. Wait for `/healthz` and `/readyz`, then repeat the post-deployment smoke in `docs/runbook.md`.
7. Confirm error rates, authentication, tenant navigation, API mutations, and notification transport return to the previous baseline.
8. Close the incident only after documenting verification, impact, and the forward-fix owner.

## Data and compatibility

The container serves static assets and performs no database migration. A rollback can still be unsafe if the backend contract changed incompatibly after the previous frontend was released. Confirm backward compatibility or roll the coordinated backend release according to its own runbook.

Persisted browser state may outlive a deployment. If a release changes storage contracts, use versioned migration/cleanup logic in the forward fix; do not instruct users to expose or manually edit tokens. Service workers and CDN caches must never serve a Mock-enabled `dist`.

## Forward fix

Reproduce the regression at the narrowest layer, add a test that fails on the affected release, fix the shared cause, rerun the complete release gate, and deploy a new immutable version. Link the incident and rollback evidence in the changelog or release record without disclosing secrets or personal data.
