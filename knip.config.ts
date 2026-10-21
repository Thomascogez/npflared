import type { KnipConfig } from "knip";

const config: KnipConfig = {
	ignoreDependencies: ["cloudflare", "@tsconfig/svelte"],
    ignore: ["./apps/doc/rspress.config.ts", "./apps/doc/styles/index.css", "./apps/api/admin/lib/components/ui/**"],
    ignoreIssues: {
        "./apps/api/src/db/relations.ts": ["exports"],
    }
};

export default config;