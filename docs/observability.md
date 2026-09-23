# Frontend observability

Status: Implemented local error boundary; external reporter integration is planned.

`src/lib/observability.ts` records bounded Vue, Promise, preload, and bootstrap errors. It removes common credentials and email addresses from diagnostic text before dispatching the `gvueter:frontend-error` event or an optional reporter callback. `src/lib/application-recovery.ts` presents safe startup and runtime-config recovery states.

No monitoring vendor, production sampling rate, retention policy, or remote alert route is configured. A deployment can attach a reporter after choosing its privacy and operations contract.
