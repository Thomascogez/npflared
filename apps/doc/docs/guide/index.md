# What is Firestash?

Firestash is a private npm registry that runs on Cloudflare: a Worker for the API and the admin UI, D1 for the metadata and R2 for the package tarballs. It is meant for a person or a team that needs to share packages privately without running a server or paying for a hosted registry.

## What it does

- **Serves npm clients.** `npm`, `pnpm` and `yarn` publish to it and install from it with a registry token, through the standard npm registry protocol. Packages that are not published to it are fetched from the public npm registry, so projects can point every install at it.
- **Keeps tokens safe.** Tokens are 256-bit random values; only their SHA-256 hash is stored, the plaintext is shown once at creation, and each token is scoped to reading or writing specific packages, or all of them.
- **Gives administrators a UI.** At `/_/admin`, administrators browse the published packages (versions, dist-tags, readme, dependencies, install command) and create or revoke tokens. They sign in through Cloudflare Access, so there is no login page or user database.
- **Explains itself to its users.** The root of every registry is a usage page with the `.npmrc` lines, the publishing steps and the token scopes, with the registry's own address filled in.
- **Deploys from Git.** Workers Builds builds and deploys every push. Everything specific to a Cloudflare account (resources, domain, Access application) is a build variable, so the same repository deploys into several accounts.

## What it does not do

Firestash is not a mirror of the public npm registry and does not try to implement every registry endpoint. It handles publishing, installing, dist-tags and tokens; search, organisations, package deprecation and the rest of the npm website features are out of scope.

## Where to go next

- [Deploy with Workers Builds](./install/workers-builds): the recommended way to run a registry.
- [Manual installation](./install/manual): the same from your machine.
- [Admin authentication](./admin/authentication) and the [admin UI](./admin/ui).
- The [registry API](./api/tokens) for scripting against a registry.

The documentation for *using* a registry (installing, publishing, tokens) is served by the registry itself, at its root.

## Credits

Firestash is a fork of [Npflared](https://github.com/Thomascogez/npflared) by Thomas Cogez, which provides the registry itself: the npm-compatible endpoints, the Cloudflare architecture and the token model. Firestash adds hashed tokens, the admin API and UI, Cloudflare Access authentication and the Git-based deployment, and is distributed under the same MIT license.
