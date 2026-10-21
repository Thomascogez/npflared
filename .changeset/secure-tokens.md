---
"@firestash/api": minor
---

Store tokens as SHA-256 hashes instead of plaintext. Tokens are now generated with 256 bits of entropy (prefixed `fst_`), the plaintext is only returned once at creation, and tokens are listed, retrieved and revoked by a stable `id` (`/-/npm/v1/tokens/token/:id`) instead of by their secret. Existing plaintext tokens keep working and are hashed on first use; `pnpm migrate-tokens:prod` hashes any that remain.
