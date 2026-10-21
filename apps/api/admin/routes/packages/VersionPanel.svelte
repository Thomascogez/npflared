<script lang="ts">
import { api } from "$lib/api";
import ErrorState from "$lib/components/ErrorState.svelte";
import * as Card from "$lib/components/ui/card/index.js";
import { Skeleton } from "$lib/components/ui/skeleton/index.js";
import * as Table from "$lib/components/ui/table/index.js";
import { renderMarkdown } from "$lib/markdown";

let { name, version }: { name: string; version: string } = $props();

let packageVersion = $derived(api.getPackageVersion(name, version));

const dependencyGroups = [
	{ key: "dependencies", label: "Dependencies" },
	{ key: "peerDependencies", label: "Peer dependencies" },
	{ key: "devDependencies", label: "Dev dependencies" }
] as const;
</script>

{#await packageVersion}
	<div class="flex flex-col gap-4" aria-busy="true">
		<Skeleton class="h-6 w-40" />
		<Skeleton class="h-4 w-full" />
		<Skeleton class="h-4 w-5/6" />
		<Skeleton class="h-4 w-2/3" />
	</div>
{:then { manifest }}
	{@const groups = dependencyGroups
		.map(({ key, label }) => ({ key, label, entries: Object.entries(manifest[key] ?? {}) }))
		.filter(({ entries }) => entries.length > 0)}
	<div class="flex flex-col gap-6">
		<Card.Root>
			<Card.Header>
				<Card.Title>Readme</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if manifest.readme?.trim()}
					<div class="prose prose-sm dark:prose-invert max-w-none prose-code:before:content-none prose-code:after:content-none">
						<!-- The readme is whatever the publisher wrote: renderMarkdown sanitises it before it is injected. -->
						{@html renderMarkdown(manifest.readme)}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">This version was published without a readme.</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Dependencies</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if groups.length === 0}
					<p class="text-sm text-muted-foreground">This version has no dependencies.</p>
				{:else}
					<Table.Root class="table-fixed">
						<Table.Body>
							{#each groups as group (group.key)}
								<Table.Row class="bg-muted/40 hover:bg-muted/40">
									<Table.Head colspan={2} class="h-8 text-xs font-medium tracking-wide text-muted-foreground uppercase">
										{group.label}
									</Table.Head>
								</Table.Row>
								{#each group.entries as [dependency, range] (dependency)}
									<Table.Row>
										<Table.Cell class="w-1/2 font-mono">{dependency}</Table.Cell>
										<Table.Cell class="font-mono text-muted-foreground">{range}</Table.Cell>
									</Table.Row>
								{/each}
							{/each}
						</Table.Body>
					</Table.Root>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
{:catch error}
	<ErrorState {error} title="Could not load this version" />
{/await}
