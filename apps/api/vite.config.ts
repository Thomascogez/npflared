import { fileURLToPath, URL } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

/**
 * The admin UI (./admin) lives in the same Vite project as the worker (./src):
 * `vite dev` runs both on one origin, `vite build` emits the worker and the client assets together.
 */
/** URLs Vite serves itself during development: source modules, pre-bundled dependencies and its client. */
const viteDevelopmentUrls = ["!/admin/*", "!/node_modules/*", "!/@vite/*", "!/@id/*", "!/@fs/*"];

export default defineConfig(({ command }) => ({
	server: {
		port: 5515
	},
	plugins: [
		cloudflare({
			config: () =>
				// Every request goes through the worker (see wrangler.toml), but in development Vite must still
				// answer its own module and HMR URLs directly. The rules are merged with the ones in wrangler.toml.
				command === "serve" ? { assets: { run_worker_first: viteDevelopmentUrls } } : {}
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
