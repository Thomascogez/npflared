import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { type D1Migration, defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

const adminScopes =
	'[{"type": "token:read+write", "values": ["*"]}, {"type": "user:read+write", "values": ["*"]}, {"type": "package:read+write", "values": ["*"]}]';

export default defineWorkersConfig(async () => {
	const migrationsPath = join(__dirname, "migrations");
	const migrations = await readD1Migrations(migrationsPath);

	const now = Date.now();

	const adminTokenId = randomUUID();
	const adminToken = `npf_${randomUUID()}`;
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
							CF_ACCESS_TEAM_DOMAIN: "npflared-test.cloudflareaccess.com",
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
