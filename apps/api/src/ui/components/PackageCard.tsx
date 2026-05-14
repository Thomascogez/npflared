import type { FC } from "hono/jsx";
import { Badge } from "./Badge";

interface PackageCardProps {
	name: string;
	latestVersion: string;
	description: string;
	license: string;
	releaseCount: number;
	updatedAt: number;
	index: number;
}

function formatDate(timestamp: number): string {
	const date = new Date(timestamp);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric"
	});
}

export const PackageCard: FC<PackageCardProps> = ({
	name,
	latestVersion,
	description,
	license,
	releaseCount,
	updatedAt,
	index
}) => {
	const encodedName = encodeURIComponent(name);

	return (
		<a
			href={`/ui/packages/${encodedName}`}
			class="group block bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:border-emerald-200 dark:hover:border-emerald-800"
			style={`animation-delay: ${index * 50}ms`}
		>
			<div class="flex items-start justify-between gap-4 mb-3">
				<h3 class="text-lg font-semibold tracking-tight text-[var(--text-primary)] group-hover:text-emerald-600 transition-colors duration-200">
					{name}
				</h3>
				<code class="font-mono text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg flex-shrink-0 border border-emerald-100 dark:border-emerald-800">
					{latestVersion}
				</code>
			</div>
			<p class="text-sm text-[var(--text-secondary)] leading-relaxed mb-4 line-clamp-2">{description}</p>
			<div class="flex items-center gap-2 flex-wrap">
				<Badge variant="latest">{license}</Badge>
				<Badge>{`${releaseCount} ${releaseCount === 1 ? "version" : "versions"}`}</Badge>
				<span class="text-xs text-[var(--text-muted)] ml-auto">Updated {formatDate(updatedAt)}</span>
			</div>
		</a>
	);
};
