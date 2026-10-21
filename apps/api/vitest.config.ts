import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { type D1Migration, defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

const adminScopes =
	'[{"type": "token:read+write", "values": ["*"]}, {"type": "user:read+write", "values": ["*"]}, {"type": "package:read+write", "values": ["*"]}]';

export default defineWorkersConfig(async () => {
	const migrationsPath = join(__dirname, "migrations");
	const migrations = await readD1Migrations(migrationsPath);

	// The assets directory (the client build output) must exist for the worker to start; the tests do not need its content.
	mkdirSync(join(__dirname, "dist/client"), { recursive: true });

	const now = Date.now();

	const adminTokenId = randomUUID();
	const adminToken = `fst_${randomUUID()}`;
	const adminTokenHash = createHash("sha256").update(adminToken).digest("hex");

	// A token created before hashing was introduced: stored in plaintext, no hash yet.
	const legacyTokenId = randomUUID();
	const legacyToken = randomUUID();

	const testSpecificMigrations: D1Migration[] = [
		{
			name: "admin-token",
			queries: [
				`INSERT INTO \`token\` (id, token_hash, name, scopes, created_at, updated_at) VALUES ('${adminTokenId}', '${adminTokenHash}', 'admin-token', '${adminScopes}', ${now}, ${now})`,
				`INSERT INTO \`token\` (id, legacy_token, name, scopes, created_at, updated_at) VALUES ('${legacyTokenId}', '${legacyToken}', 'legacy-token', '${adminScopes}', ${now}, ${now})`
			]
		}
	];

	return {
		test: {
			setupFiles: ["./__tests__/setup.ts"],
			poolOptions: {
				workers: {
					singleWorker: true,
					wrangler: { configPath: "./wrangler.toml" },
					main: "./src/index.ts",
					miniflare: {
						bindings: {
							TEST_MIGRATIONS: migrations.concat(testSpecificMigrations),
							// Pinned so that a developer's .dev.vars (eg. the local provider) cannot change what the tests exercise.
							ADMIN_AUTH_PROVIDER: "cloudflare-access",
							CF_ACCESS_TEAM_DOMAIN: "firestash-test.cloudflareaccess.com",
							CF_ACCESS_AUD: randomUUID().replaceAll("-", ""),
							ADMIN_TOKEN: adminToken,
							ADMIN_TOKEN_ID: adminTokenId,
							LEGACY_TOKEN: legacyToken,
							LEGACY_TOKEN_ID: legacyTokenId
						}
					}
				}
			}
		}
	};
});
