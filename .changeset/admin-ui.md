---
"@npflared/api": minor
"@npflared/admin": minor
---

Add the admin UI, a Svelte 5 application served by the worker at `/_/admin` behind admin authentication: browse published packages (versions, dist-tags, readme, dependencies, install command) and manage registry tokens (create with scopes, reveal once, revoke). A `local` admin authentication provider, which only trusts requests addressed to `localhost`, makes the admin area usable with `wrangler dev`.
