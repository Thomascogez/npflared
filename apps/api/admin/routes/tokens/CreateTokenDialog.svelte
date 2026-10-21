<script lang="ts">
import PlusIcon from "@lucide/svelte/icons/plus";
import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
import XIcon from "@lucide/svelte/icons/x";
import { api, type CreatedToken, type ScopeType, scopeTypes } from "$lib/api";
import CopyButton from "$lib/components/CopyButton.svelte";
import * as Alert from "$lib/components/ui/alert/index.js";
import { Button } from "$lib/components/ui/button/index.js";
import * as Dialog from "$lib/components/ui/dialog/index.js";
import { Input } from "$lib/components/ui/input/index.js";
import { Label } from "$lib/components/ui/label/index.js";
import * as Select from "$lib/components/ui/select/index.js";
import { errorMessage } from "$lib/format";

let { open = $bindable(false), oncreated }: { open?: boolean; oncreated?: () => void } = $props();

type ScopeDraft = { id: number; type: ScopeType; values: string };

let nextScopeId = 1;
const newScope = (type: ScopeType = "package:read", values = "*"): ScopeDraft => ({ id: nextScopeId++, type, values });

let name = $state("");
let scopes = $state<ScopeDraft[]>([newScope()]);
let submitting = $state(false);
let error = $state<string | null>(null);
let created = $state<CreatedToken | null>(null);

/** Only package scopes are narrowed to specific names; token and user scopes always apply to all of them. */
const appliesToPackages = (type: ScopeType) => type.startsWith("package:");

const scopeValues = (scope: ScopeDraft) => (appliesToPackages(scope.type) ? parseValues(scope.values) : ["*"]);

const parseValues = (raw: string) =>
	raw
		.split(",")
		.map((value) => value.trim())
		.filter((value) => value.length > 0);

let valid = $derived(name.trim().length > 0 && scopes.every((scope) => scopeValues(scope).length > 0));

const reset = () => {
	name = "";
	scopes = [newScope()];
	error = null;
	created = null;
	submitting = false;
};

const submit = async (event: SubmitEvent) => {
	event.preventDefault();
	submitting = true;
	error = null;

	try {
		created = await api.createToken({
			name: name.trim(),
			scopes: scopes.map((scope) => ({ type: scope.type, values: scopeValues(scope) }))
		});
		oncreated?.();
	} catch (cause) {
		error = errorMessage(cause);
	} finally {
		submitting = false;
	}
};
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (!isOpen) {
			reset();
		}
	}}
>
	<Dialog.Content class="sm:max-w-lg">
		{#if created}
			<Dialog.Header>
				<Dialog.Title>Token created</Dialog.Title>
				<Dialog.Description>“{created.name}” is ready to use.</Dialog.Description>
			</Dialog.Header>
			<Alert.Root>
				<TriangleAlertIcon />
				<Alert.Title>Copy it now</Alert.Title>
				<Alert.Description>This token is shown only once and cannot be recovered later.</Alert.Description>
			</Alert.Root>
			<div class="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
				<code class="min-w-0 flex-1 text-sm break-all">{created.token}</code>
				<CopyButton value={created.token} label="Copy" />
			</div>
			<p class="text-sm text-muted-foreground">
				Add it to your <code>.npmrc</code> as <code>//your-registry/:_authToken=…</code>
			</p>
			<Dialog.Footer>
				<Button
					onclick={() => {
						open = false;
					}}
				>
					Done
				</Button>
			</Dialog.Footer>
		{:else}
			<form class="contents" onsubmit={submit}>
				<Dialog.Header>
					<Dialog.Title>New token</Dialog.Title>
					<Dialog.Description>Tokens authenticate npm clients against this registry.</Dialog.Description>
				</Dialog.Header>

				<div class="flex flex-col gap-2">
					<Label for="token-name">Name</Label>
					<Input id="token-name" bind:value={name} placeholder="CI deploy key" required autocomplete="off" />
				</div>

				<fieldset class="flex flex-col gap-2">
					<legend class="mb-2 text-sm font-medium">Scopes</legend>
					{#each scopes as scope (scope.id)}
						<div class="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-2">
							<Select.Root
								type="single"
								value={scope.type}
								onValueChange={(value) => {
									scope.type = value as ScopeType;
								}}
							>
								<Select.Trigger class="w-full" aria-label="Scope type">
									<span class="font-mono text-xs">{scope.type}</span>
								</Select.Trigger>
								<Select.Content>
									{#each scopeTypes as type (type)}
										<Select.Item value={type} label={type}>
											<span class="font-mono text-xs">{type}</span>
										</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							{#if appliesToPackages(scope.type)}
								<Input bind:value={scope.values} placeholder="* or names, comma separated" aria-label="Package names" />
							{:else}
								<Input value="" placeholder="Applies to all" aria-label="Package names" disabled />
							{/if}
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="Remove scope"
								disabled={scopes.length === 1}
								onclick={() => {
									scopes = scopes.filter((candidate) => candidate.id !== scope.id);
								}}
							>
								<XIcon />
							</Button>
						</div>
					{/each}
					<div>
						<Button
							variant="outline"
							size="sm"
							onclick={() => {
								scopes.push(newScope());
							}}
						>
							<PlusIcon />
							Add scope
						</Button>
					</div>
					<p class="text-xs text-muted-foreground">
						Package scopes take <code>*</code> for every package, or package names such as
						<code>@my-scope/my-package</code>. Token and user scopes apply to all tokens and users.
					</p>
				</fieldset>

				{#if error}
					<Alert.Root variant="destructive">
						<Alert.Title>Could not create the token</Alert.Title>
						<Alert.Description>{error}</Alert.Description>
					</Alert.Root>
				{/if}

				<Dialog.Footer>
					<Dialog.Close>
						{#snippet child({ props })}
							<Button variant="outline" {...props}>Cancel</Button>
						{/snippet}
					</Dialog.Close>
					<Button type="submit" disabled={!valid || submitting}>
						{submitting ? "Creating…" : "Create token"}
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
