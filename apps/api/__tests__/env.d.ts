declare module "cloudflare:test" {
	// Controls the type of `import("cloudflare:test").env`

	interface ProvidedEnv extends Env {
		TEST_MIGRATIONS: D1Migration[];
		FALLBACK_REGISTRY_ENDPOINT: string;
		CF_ACCESS_TEAM_DOMAIN: string;
		CF_ACCESS_AUD: string;
		ADMIN_TOKEN: string;
		ADMIN_TOKEN_ID: string;
		LEGACY_TOKEN: string;
		LEGACY_TOKEN_ID: string;
	}
}
