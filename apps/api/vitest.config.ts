import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { type D1Migration, defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => {
	const migrationsPath = join(__dirname, "migrations");
	const migrations = await readD1Migrations(migrationsPath);

	const now = Date.now();
	const adminToken = randomUUID();

	const testSpecificMigrations: D1Migration[] = [
		{
			name: "admin-token",
			queries: [
				`INSERT INTO \`token\` (token, name, scopes, created_at, updated_at) VALUES ('${adminToken}', 'admin-token', '[{"type": "token:read+write", "values": ["*"]}, {"type": "user:read+write", "values": ["*"]}, {"type": "package:read+write", "values": ["*"]}]', ${now}, ${now})`
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
							ADMIN_TOKEN: adminToken
						}
					}
				}
			}
		}
	};
});
