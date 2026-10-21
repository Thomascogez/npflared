import { fileURLToPath, URL } from "node:url";
import { cloudflare, type WorkerConfig } from "@cloudflare/vite-plugin";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

/**
 * The admin UI (./admin) lives in the same Vite project as the worker (./src):
 * `vite dev` runs both on one origin, `vite build` emits the worker and the client assets together.
 */

/** URLs Vite serves itself during development: source modules, pre-bundled dependencies and its client. */
const viteDevelopmentUrls = ["!/admin/*", "!/node_modules/*", "!/@vite/*", "!/@id/*", "!/@fs/*"];

/**
 * Applies the deployment-specific values (see .env.example) to the worker configuration at build time,
 * so that the same repository deploys to any Cloudflare account: wrangler.toml only holds placeholders.
 * Values come from the environment, which is how Workers Builds variables reach the build, or from a local .env file.
 */
let loggedAppliedValues = false;

const applyDeploymentConfig = (config: WorkerConfig, env: Record<string, string>) => {
	const applied: string[] = [];
	const use = (name: string, apply: (value: string) => void) => {
		if (env[name]) {
			apply(env[name]);
			applied.push(name);
		}
	};

	use("FIRESTASH_WORKER_NAME", (name) => {
		config.name = name;
	});
	use("FIRESTASH_CUSTOM_DOMAIN", (domain) => {
		// With a custom domain the workers.dev URL is disabled: the admin area is only protected by Access there.
		config.routes = [{ pattern: domain, custom_domain: true }];
		config.workers_dev = false;
	});
	for (const database of config.d1_databases ?? []) {
		if (database.binding === "DB") {
			use("FIRESTASH_D1_DATABASE_ID", (id) => {
				database.database_id = id;
			});
			use("FIRESTASH_D1_DATABASE_NAME", (name) => {
				database.database_name = name;
			});
		}
	}
	for (const bucket of config.r2_buckets ?? []) {
		if (bucket.binding === "BUCKET") {
			use("FIRESTASH_R2_BUCKET_NAME", (name) => {
				bucket.bucket_name = name;
			});
		}
	}
	for (const variable of [
		"ADMIN_AUTH_PROVIDER",
		"CF_ACCESS_TEAM_DOMAIN",
		"CF_ACCESS_AUD",
		"FALLBACK_REGISTRY_ENDPOINT"
	]) {
		use(variable, (value) => {
			config.vars = { ...config.vars, [variable]: value };
		});
	}

	if (applied.length > 0 && !loggedAppliedValues) {
		loggedAppliedValues = true;
		console.log(`firestash: deployment values applied from the environment: ${applied.join(", ")}`);
	}
};

export default defineConfig(({ command, mode }) => ({
	plugins: [
		cloudflare({
			config: (config) => {
				if (command === "serve") {
					// Every request goes through the worker (see wrangler.toml), but in development Vite must still
					// answer its own module and HMR URLs directly.
					const runWorkerFirst = config.assets?.run_worker_first;
					const rules = Array.isArray(runWorkerFirst) ? runWorkerFirst : runWorkerFirst ? ["/*"] : [];
					config.assets = { ...config.assets, run_worker_first: [...rules, ...viteDevelopmentUrls] };
					return;
				}

				applyDeploymentConfig(config, loadEnv(mode, fileURLToPath(new URL(".", import.meta.url)), ""));
			}
		}),
		tailwindcss(),
		svelte()
	],
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL("./admin/lib", import.meta.url))
		}
	},
	environments: {
		client: {
			build: {
				// Hashed assets are served directly under the admin path, everything else goes through the worker.
				assetsDir: "_/admin/assets"
			}
		}
	}
}));
