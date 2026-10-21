---
"@firestash/api": minor
---

Add the admin UI, a Svelte 5 application served by the worker at `/_/admin` behind admin authentication: browse published packages (versions, dist-tags, readme, dependencies, install command) and manage registry tokens (create with scopes, reveal once, revoke). The UI lives in the same Vite project as the worker, through the Cloudflare Vite plugin: `vite dev` serves both on one origin, `vite build` emits them together and `wrangler deploy` picks up the result. A `local` admin authentication provider, which only trusts requests addressed to `localhost`, makes the admin area usable in development.
