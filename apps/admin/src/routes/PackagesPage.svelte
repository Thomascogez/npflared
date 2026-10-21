<script lang="ts">
import SearchIcon from "@lucide/svelte/icons/search";
import { api } from "$lib/api";
import EmptyState from "$lib/components/EmptyState.svelte";
import ErrorState from "$lib/components/ErrorState.svelte";
import PageHeader from "$lib/components/PageHeader.svelte";
import TableSkeleton from "$lib/components/TableSkeleton.svelte";
import { Badge } from "$lib/components/ui/badge/index.js";
import { Button } from "$lib/components/ui/button/index.js";
import { Input } from "$lib/components/ui/input/index.js";
import * as Table from "$lib/components/ui/table/index.js";
import { formatDate, formatRelative, toIsoString } from "$lib/format";
import { router } from "$lib/router.svelte";

const limit = 20;

// The search and page live in the URL so that reloads and the back button keep them.
let search = $derived(router.query.get("search") ?? "");
let page = $derived(Math.max(1, Number(router.query.get("page")) || 1));
let packages = $derived(api.listPackages({ search, page, limit }));

const navigateTo = (params: URLSearchParams, options?: { replace?: boolean }) => {
	const query = params.toString();
	router.navigate(`/packages${query ? `?${query}` : ""}`, options);
};

let searchTimer: ReturnType<typeof setTimeout> | undefined;

const updateSearch = (value: string) => {
	clearTimeout(searchTimer);
	searchTimer = setTimeout(() => {
		const params = new URLSearchParams();

		if (value.trim()) {
			params.set("search", value.trim());
		}

		navigateTo(params, { replace: true });
	}, 250);
};

const goToPage = (next: number) => {
	const params = new URLSearchParams(router.query);

	if (next > 1) {
		params.set("page", String(next));
	} else {
		params.delete("page");
	}

	navigateTo(params);
};
</script>

<PageHeader title="Packages" description="Packages published to this registry." />

<div class="relative mb-4 max-w-sm">
	<SearchIcon class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
	<Input
		type="search"
		placeholder="Search packages"
		aria-label="Search packages"
		class="pl-8"
		value={search}
		oninput={(event) => updateSearch(event.currentTarget.value)}
	/>
</div>

{#await packages}
	<TableSkeleton />
{:then result}
	{#if result.total === 0}
		<EmptyState
			title={search ? "No packages match" : "No packages yet"}
			description={search
				? `Nothing published matches “${search}”.`
				: "Packages published to this registry will show up here."}
		/>
	{:else}
		<div class="rounded-xl border">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Package</Table.Head>
						<Table.Head>Latest</Table.Head>
						<Table.Head class="text-right">Versions</Table.Head>
						<Table.Head>Last update</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each result.items as item (item.name)}
						<Table.Row>
							<Table.Cell>
								<a href={router.resolve(`/packages/${encodeURIComponent(item.name)}`)} class="font-medium hover:underline">
									{item.name}
								</a>
							</Table.Cell>
							<Table.Cell>
								{#if item.latestVersion}
									<Badge variant="secondary" class="font-mono">{item.latestVersion}</Badge>
								{:else}
									<span class="text-muted-foreground">—</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-right tabular-nums">{item.versionCount}</Table.Cell>
							<Table.Cell>
								<time datetime={toIsoString(item.updatedAt)} title={formatDate(item.updatedAt)}>
									{formatRelative(item.updatedAt)}
								</time>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
		<div class="mt-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
			<p>
				{(result.page - 1) * result.limit + 1}–{Math.min(result.page * result.limit, result.total)} of {result.total}
			</p>
			<div class="flex gap-2">
				<Button variant="outline" size="sm" disabled={result.page <= 1} onclick={() => goToPage(result.page - 1)}>
					Previous
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={result.page * result.limit >= result.total}
					onclick={() => goToPage(result.page + 1)}
				>
					Next
				</Button>
			</div>
		</div>
	{/if}
{:catch error}
	<ErrorState {error} title="Could not load packages" />
{/await}
