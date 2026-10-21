<script lang="ts">
import PlusIcon from "@lucide/svelte/icons/plus";
import { api, type Token } from "$lib/api";
import EmptyState from "$lib/components/EmptyState.svelte";
import ErrorState from "$lib/components/ErrorState.svelte";
import PageHeader from "$lib/components/PageHeader.svelte";
import ScopeBadges from "$lib/components/ScopeBadges.svelte";
import TableSkeleton from "$lib/components/TableSkeleton.svelte";
import { Button } from "$lib/components/ui/button/index.js";
import * as Table from "$lib/components/ui/table/index.js";
import { formatDate, formatRelative, toIsoString } from "$lib/format";
import CreateTokenDialog from "./tokens/CreateTokenDialog.svelte";
import RevokeTokenDialog from "./tokens/RevokeTokenDialog.svelte";

/** Bumped after every change so the list is fetched again. */
let revision = $state(0);
const loadTokens = (_revision: number) => api.listTokens();
let tokens = $derived(loadTokens(revision));

const refresh = () => {
	revision += 1;
};

let creating = $state(false);
let revoking = $state<Token | null>(null);
</script>

<PageHeader title="Tokens" description="Registry tokens used by npm clients and automation.">
	{#snippet actions()}
		<Button
			onclick={() => {
				creating = true;
			}}
		>
			<PlusIcon />
			New token
		</Button>
	{/snippet}
</PageHeader>

{#await tokens}
	<TableSkeleton columns={3} />
{:then list}
	{#if list.length === 0}
		<EmptyState title="No tokens yet" description="Create a token to let npm clients publish to or install from this registry.">
			<Button
				onclick={() => {
					creating = true;
				}}
			>
				<PlusIcon />
				New token
			</Button>
		</EmptyState>
	{:else}
		<div class="rounded-xl border">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head>Scopes</Table.Head>
						<Table.Head>Created</Table.Head>
						<Table.Head class="w-0"><span class="sr-only">Actions</span></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each list as token (token.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{token.name}</Table.Cell>
							<Table.Cell><ScopeBadges scopes={token.scopes} /></Table.Cell>
							<Table.Cell>
								<time datetime={toIsoString(token.createdAt)} title={formatDate(token.createdAt)}>
									{formatRelative(token.createdAt)}
								</time>
							</Table.Cell>
							<Table.Cell class="text-right">
								<Button
									variant="ghost"
									size="sm"
									class="text-destructive"
									onclick={() => {
										revoking = token;
									}}
								>
									Revoke
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
{:catch error}
	<ErrorState {error} title="Could not load tokens" retry={refresh} />
{/await}

<CreateTokenDialog bind:open={creating} oncreated={refresh} />
<RevokeTokenDialog
	token={revoking}
	onclose={() => {
		revoking = null;
	}}
	onrevoked={refresh}
/>
