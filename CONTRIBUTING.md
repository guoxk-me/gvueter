# Contributing

Use the pinned Node.js and pnpm versions. Keep dependency versions in the pnpm catalog and run the repository gates before review:

```sh
pnpm install --frozen-lockfile
pnpm run check
pnpm run test:unit --run
pnpm run release:check
```

The current application is a frontend foundation. Add business features only with a defined backend contract. Keep the public starter deployable without a backend, retain strict TypeScript, and update [architecture](./docs/admin-architecture.md) and [deployment](./docs/deployment.md) documentation when those boundaries change.
