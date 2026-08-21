import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";


export default defineConfig({
	plugins: [cloudflare(), tailwindcss()],
});
