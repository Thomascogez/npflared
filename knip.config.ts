import type { KnipConfig } from "knip";

const config: KnipConfig = {
	ignoreDependencies: ["cloudflare"],
    ignore: ["./apps/doc/rspress.config.ts"]
};

export default config;