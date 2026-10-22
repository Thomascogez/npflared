# Firestash

<img src="./apps/doc/docs/public/firestash.avif" height="222">

A private npm registry that runs entirely in your Cloudflare account, on Workers, D1 and R2, with an admin UI behind Cloudflare Access.

- **Works with npm, pnpm and yarn.** Publish and install with a registry token; packages that are not published to the registry are fetched from the public npm registry, so it can be the only registry your projects use.
- **Tokens done properly.** Only a SHA-256 hash is stored, the plaintext is shown once, and every token is scoped to read or write specific packages.
- **An admin area at `/_/admin`.** Browse packages (versions, dist-tags, readme, dependencies) and manage tokens. Administrators sign in through Cloudflare Access: there is no user database.
- **A usage page at the root of every registry** that tells your team how to install from it, publish to it and get a token.
- **Deploys from Git.** Workers Builds builds and deploys on every push; the account-specific values (resources, domain, Access) are build variables, so one repository serves as many Cloudflare accounts as you need.

## Documentation

The guide in [`apps/doc`](apps/doc/docs) covers [deploying with Workers Builds](apps/doc/docs/guide/install/workers-builds.mdx), [installing by hand](apps/doc/docs/guide/install/manual.mdx), the [admin area](apps/doc/docs/guide/admin/ui.mdx) and [its authentication](apps/doc/docs/guide/admin/authentication.mdx), and the [registry API](apps/doc/docs/guide/api/tokens.mdx). It can be published as a static site alongside the registry.

## Development

```bash
pnpm install
cd apps/api
cp .dev.vars.example .dev.vars   # local admin authentication provider
pnpm migrate:local
pnpm dev                         # registry, admin API and admin UI on http://localhost:5173
```

The admin UI is at `http://localhost:5173/_/admin/`. `pnpm quality` at the root runs the linters, type checks and tests.

## Credits

Firestash is a fork of [Npflared](https://github.com/Thomascogez/npflared) by Thomas Cogez, which provides the registry itself: the npm-compatible endpoints, the Cloudflare architecture and the token model. Firestash adds hashed tokens, the admin API and UI, Cloudflare Access authentication and the Git-based deployment. It is distributed under the same MIT license, see [LICENSE](LICENSE).
