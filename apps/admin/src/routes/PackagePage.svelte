<script lang="ts">
import { ApiError, api } from "$lib/api";
import CopyButton from "$lib/components/CopyButton.svelte";
import EmptyState from "$lib/components/EmptyState.svelte";
import ErrorState from "$lib/components/ErrorState.svelte";
import { Badge } from "$lib/components/ui/badge/index.js";
import { Button } from "$lib/components/ui/button/index.js";
import * as Card from "$lib/components/ui/card/index.js";
import { Skeleton } from "$lib/components/ui/skeleton/index.js";
import { formatDate, installCommand, toIsoString } from "$lib/format";
import { router } from "$lib/router.svelte";
import VersionPanel from "./packages/VersionPanel.svelte";

let { name }: { name: string } = $props();

let details = $derived(api.getPackage(name));

/** The version whose readme and dependencies are shown; the latest one until a version is picked. */
let selectedVersion = $state<string | null>(null);
</script>

<nav aria-label="Breadcrumb" class="mb-4 text-sm text-muted-foreground">
	<a href={router.resolve("/packages")} class="hover:underline">Packages</a>
	<span class="mx-1.5">/</span>
	<span class="text-foreground">{name}</span>
</nav>

{#await details}
	<div class="flex flex-col gap-4" aria-busy="true">
		<Skeleton class="h-8 w-64" />
		<Skeleton class="h-4 w-96" />
		<Skeleton class="h-40 w-full" />
	</div>
{:then pkg}
	{@const current = selectedVersion ?? pkg.latestVersion ?? pkg.versions[0]?.version ?? null}
	<div class="mb-6 flex flex-wrap items-start justify-between gap-4">
		<div class="min-w-0">
			<h1 class="text-2xl font-semibold tracking-tight break-all">{pkg.name}</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				{pkg.description ?? "No description."}
			</p>
			<div class="mt-3 flex flex-wrap gap-1.5">
				{#each Object.entries(pkg.distTags) as [tag, version] (tag)}
					<Badge variant={tag === "latest" ? "default" : "secondary"} class="font-mono">{tag}: {version}</Badge>
				{/each}
			</div>
		</div>
		<div class="flex items-center gap-2 rounded-lg border bg-muted/40 py-1.5 pr-1.5 pl-3">
			<code class="text-sm">{installCommand(pkg.name)}</code>
			<CopyButton value={installCommand(pkg.name)} label="Copy" size="xs" variant="ghost" />
		</div>
	</div>

	{#if current === null}
		<EmptyState title="No versions" description="This package has no published version." />
	{:else}
		<div class="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
			<Card.Root class="self-start">
				<Card.Header>
					<Card.Title>Versions</Card.Title>
					<Card.Description>{pkg.versions.length} published</Card.Description>
				</Card.Header>
				<Card.Content class="px-2">
					<ul class="flex flex-col gap-0.5">
						{#each pkg.versions as release (release.version)}
							<li>
								<Button
									variant="ghost"
									class={["h-auto w-full justify-between py-1.5", release.version === current && "bg-muted"]}
									aria-pressed={release.version === current}
									onclick={() => {
										selectedVersion = release.version;
									}}
								>
									<span class="flex items-center gap-2">
										<span class="font-mono">{release.version}</span>
										{#if pkg.distTags[release.tag] === release.version}
											<Badge variant="outline" class="font-normal">{release.tag}</Badge>
										{/if}
									</span>
									<time
										datetime={toIsoString(release.createdAt)}
										title={formatDate(release.createdAt)}
										class="text-xs text-muted-foreground"
									>
										{new Date(release.createdAt).toLocaleDateString()}
									</time>
								</Button>
							</li>
						{/each}
					</ul>
				</Card.Content>
			</Card.Root>

			<div class="min-w-0">
				<h2 class="mb-3 text-lg font-medium">
					<span class="font-mono">{pkg.name}@{current}</span>
				</h2>
				<VersionPanel name={pkg.name} version={current} />
			</div>
		</div>
	{/if}
{:catch error}
	{#if error instanceof ApiError && error.status === 404}
		<EmptyState title="Package not found" description={`“${name}” has not been published to this registry.`}>
			<Button variant="outline" href={router.resolve("/packages")}>Back to packages</Button>
		</EmptyState>
	{:else}
		<ErrorState {error} title="Could not load this package" />
	{/if}
{/await}
