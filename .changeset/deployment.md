---
"@firestash/api": minor
---

Make deployments account-agnostic: the worker name, custom domain, D1 database, R2 bucket and Cloudflare Access values are applied to the worker configuration at build time from the environment (Workers Builds variables or a local `.env.local`, see `.env.example`), so the same repository deploys into any Cloudflare account. `pnpm deploy` builds, applies the D1 migrations and deploys; `pnpm release` does the last two for Git-connected builds.
