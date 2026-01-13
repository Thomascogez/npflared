import { defineConfig } from "tsdown/config";

export default defineConfig({
	clean: true,
	entry: ["src/index.ts"],
	format: ["esm"],
	minify: true,
	target: "esnext",
	outDir: "dist"
});
