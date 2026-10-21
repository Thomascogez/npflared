---
"@firestash/api": minor
---

Add admin authentication through Cloudflare Access. Every request to `/_/admin` (and below) must carry a valid Access JWT, which is validated server-side against the team's signing keys (`CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`); the admin area stays closed until these are configured. `GET /_/admin/api/me` returns the authenticated administrator. Registry routes are unaffected and keep using registry tokens.
