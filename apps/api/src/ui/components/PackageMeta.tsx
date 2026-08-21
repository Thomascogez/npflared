import type { FC } from "hono/jsx";
import { Badge } from "./Badge";
import { VersionList } from "./VersionList";

interface PackageMetaProps {
	distTags: Record<string, string>;
	license: string;
	releaseCount: number;
	createdAt: number;
	updatedAt: number;
	versions: Array<{
		version: string;
		tag: string;
		createdAt: number;
	}>;
}

function formatDate(timestamp: number): string {
	const date = new Date(timestamp);
	return date.toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric"
	});
}

export const PackageMeta: FC<PackageMetaProps> = ({
	distTags,
	license,
	releaseCount,
	createdAt,
	updatedAt,
	versions
}) => {
	return (
		<div class="space-y-5">
			<div class="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
				<div class="px-5 py-4 border-b border-[var(--border-color)]">
					<h3 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Metadata</h3>
				</div>
				<div class="divide-y divide-[var(--border-color)]">
					<div class="px-5 py-3.5 flex items-center justify-between">
						<span class="text-sm text-[var(--text-muted)]">License</span>
						<span class="text-sm font-medium text-[var(--text-primary)]">{license}</span>
					</div>
					<div class="px-5 py-3.5 flex items-center justify-between">
						<span class="text-sm text-[var(--text-muted)]">Versions</span>
						<span class="text-sm font-medium text-[var(--text-primary)]">{releaseCount}</span>
					</div>
					<div class="px-5 py-3.5 flex items-center justify-between">
						<span class="text-sm text-[var(--text-muted)]">Published</span>
						<span class="text-sm text-[var(--text-primary)]">{formatDate(createdAt)}</span>
					</div>
					<div class="px-5 py-3.5 flex items-center justify-between">
						<span class="text-sm text-[var(--text-muted)]">Last Updated</span>
						<span class="text-sm text-[var(--text-primary)]">{formatDate(updatedAt)}</span>
					</div>
				</div>
			</div>

			<div class="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
				<div class="px-5 py-4 border-b border-[var(--border-color)]">
					<h3 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Dist Tags</h3>
				</div>
				<div class="px-5 py-4 flex flex-wrap gap-2">
					{Object.entries(distTags).map(([tag, version]) => (
						<div key={tag} class="flex items-center gap-2">
							<Badge variant={tag === "latest" ? "latest" : "default"}>{tag}</Badge>
							<code class="font-mono text-xs text-[var(--text-secondary)]">{version}</code>
						</div>
					))}
				</div>
			</div>

			<div class="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
				<div class="px-5 py-4 border-b border-[var(--border-color)]">
					<h3 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Versions</h3>
				</div>
				<div class="px-2 py-2">
					<VersionList versions={versions} />
				</div>
			</div>
		</div>
	);
};
