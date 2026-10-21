import type { KnipConfig } from "knip";

const config: KnipConfig = {
	ignoreDependencies: ["cloudflare"],
    ignore: ["./apps/doc/rspress.config.ts", "./apps/doc/styles/index.css", "./apps/admin/src/lib/components/ui/**"],
    ignoreIssues: {
        "./apps/api/src/db/relations.ts": ["exports"],
    }
};

export default config;