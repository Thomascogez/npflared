import { fileURLToPath, URL } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

/** The admin UI is served by the registry worker under this path, which can never be a package name. */
const base = "/_/admin/";

export default defineConfig({
	base,
	plugins: [tailwindcss(), svelte()],
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL("./src/lib", import.meta.url))
		}
	},
	build: {
		// Built straight into the worker's static assets, see apps/api/wrangler.toml.
		outDir: fileURLToPath(new URL("../api/public/_/admin", import.meta.url)),
		emptyOutDir: true
	},
	server: {
		// During development the API is served by `wrangler dev` (pnpm dev in apps/api).
		proxy: {
			[`${base}api`]: "http://localhost:8787"
		}
	}
});
