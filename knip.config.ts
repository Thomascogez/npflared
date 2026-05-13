import type { KnipConfig } from "knip";

const config: KnipConfig = {
	ignoreDependencies: ["cloudflare"],
    ignore: ["./apps/doc/rspress.config.ts"],
    ignoreIssues: {
        "./apps/api/src/db/relations.ts": ["exports"],
    }
};

export default config;