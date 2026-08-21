import type { FC } from "hono/jsx";

interface VersionListProps {
	versions: Array<{
		version: string;
		tag: string;
		createdAt: number;
	}>;
}

function formatDate(timestamp: number): string {
	const date = new Date(timestamp);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric"
	});
}

export const VersionList: FC<VersionListProps> = ({ versions }) => {
	const sortedVersions = [...versions].sort((a, b) => b.createdAt - a.createdAt);

	return (
		<div class="divide-y divide-[var(--border-color)]">
			{sortedVersions.map((v, i) => (
				<div
					key={v.version}
					class="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
				>
					<div class="flex items-center gap-3">
						<code class="font-mono text-sm text-[var(--text-primary)]">{v.version}</code>
						{i === 0 && (
							<span class="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800 uppercase tracking-wide">
								latest
							</span>
						)}
					</div>
					<span class="text-xs text-[var(--text-muted)]">{formatDate(v.createdAt)}</span>
				</div>
			))}
		</div>
	);
};
