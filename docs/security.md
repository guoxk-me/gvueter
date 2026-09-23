# Security boundary

Status: Implemented frontend safeguards; backend authorization remains future work.

Runtime Config accepts only a bounded public API URL and never stores secrets. The reference container validates deployment inputs, serves security headers, runs as an unprivileged user, and prevents API paths from falling back to HTML. Request IDs are generated when missing and safe values are forwarded to the backend.

The public starter has no login, session, or authorization behavior. The retained route-access and HTTP credential hooks are inactive until a real gnester-lite contract is implemented. Every future protected operation must be authorized by the backend. A frontend route guard or hidden control is only a user-experience layer.

PWA caches static assets only; API responses and runtime configuration use the network. See [Deployment](./deployment.md).
