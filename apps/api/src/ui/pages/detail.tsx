import type { FC } from "hono/jsx";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import { PackageMeta } from "../components/PackageMeta";

interface DetailPageProps {
	name: string;
	latestVersion: string;
	readme?: string;
	license: string;
	releaseCount: number;
	createdAt: number;
	updatedAt: number;
	distTags: Record<string, string>;
	versions: Array<{
		version: string;
		tag: string;
		createdAt: number;
		manifest: unknown;
	}>;
}

export const DetailPage: FC<DetailPageProps> = ({
	name,
	latestVersion,
	readme,
	license,
	releaseCount,
	createdAt,
	updatedAt,
	distTags,
	versions
}) => {
	const installCommand = `npm install ${name}`;

	return (
		<div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
			<div class="mb-10">
				<a
					href="/ui/packages"
					class="inline-flex items-center text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-200 mb-5"
				>
					<svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
						<title>Left arrow</title>
						<path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
					</svg>
					Back to packages
				</a>
				<div class="flex flex-wrap items-center gap-3">
					<h1 class="text-3xl md:text-5xl font-bold tracking-tighter text-[var(--text-primary)]">{name}</h1>
					<code class="font-mono text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800">
						{latestVersion}
					</code>
					{distTags.latest === latestVersion && (
						<span class="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
							latest
						</span>
					)}
				</div>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">
				<div class="space-y-8">
					<div class="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
						<div class="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
							<h2 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Install</h2>
							<span class="text-xs text-[var(--text-muted)]">npm / yarn / pnpm</span>
						</div>
						<div class="p-6">
							<div class="relative group">
								<pre class="bg-[var(--bg-code)] text-zinc-100 rounded-xl p-5 overflow-x-auto font-mono text-sm">
									<code>{installCommand}</code>
								</pre>
								<button
									type="button"
									class="absolute top-3 right-3 p-2 rounded-lg bg-zinc-800/70 hover:bg-zinc-700/80 text-zinc-400 hover:text-zinc-100 transition-all duration-200 opacity-0 group-hover:opacity-100"
									aria-label="Copy install command"
									onclick={`
										navigator.clipboard.writeText('${installCommand}');
										const btn = this;
										const original = btn.innerHTML;
										btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>';
										setTimeout(() => btn.innerHTML = original, 2000);
									`}
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5"
										/>
									</svg>
								</button>
							</div>
						</div>
					</div>

					{readme ? (
						<div class="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
							<div class="px-6 py-4 border-b border-[var(--border-color)]">
								<h2 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">README</h2>
							</div>
							<div class="p-6 md:p-8">
								<MarkdownRenderer content={readme} />
							</div>
						</div>
					) : (
						<div class="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-12 text-center">
							<div class="w-14 h-14 mx-auto mb-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
								<svg
									class="w-7 h-7 text-zinc-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									stroke-width="1.5"
								>
									<title>Document icon</title>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
									/>
								</svg>
							</div>
							<h3 class="text-lg font-semibold text-[var(--text-primary)] mb-1.5">No README</h3>
							<p class="text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
								This package does not have a README. Consider adding one to help others understand how to use it.
							</p>
						</div>
					)}
				</div>

				<div class="lg:sticky lg:top-24 lg:self-start">
					<PackageMeta
						distTags={distTags}
						license={license}
						releaseCount={releaseCount}
						createdAt={createdAt}
						updatedAt={updatedAt}
						versions={versions.map((v) => ({
							version: v.version,
							tag: v.tag,
							createdAt: v.createdAt
						}))}
					/>
				</div>
			</div>
		</div>
	);
};
