import type { KnipConfig } from "knip";

const config: KnipConfig = {
	ignoreDependencies: ["cloudflare"],
    ignore: [
        "./apps/doc/rspress.config.ts",
        
        "./app/api/src/db/relations.ts"
    ]
};

export default config;