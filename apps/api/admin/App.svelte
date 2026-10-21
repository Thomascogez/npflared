<script lang="ts">
import KeyRoundIcon from "@lucide/svelte/icons/key-round";
import PackageIcon from "@lucide/svelte/icons/package";
import { api } from "$lib/api";
import { handleLinkClick, router } from "$lib/router.svelte";
import NotFoundPage from "./routes/NotFoundPage.svelte";
import PackagePage from "./routes/PackagePage.svelte";
import PackagesPage from "./routes/PackagesPage.svelte";
import TokensPage from "./routes/TokensPage.svelte";

const navigation = [
	{
		href: "/packages",
		label: "Packages",
		icon: PackageIcon,
		isActive: (path: string) => path === "/" || path.startsWith("/packages")
	},
	{ href: "/tokens", label: "Tokens", icon: KeyRoundIcon, isActive: (path: string) => path.startsWith("/tokens") }
];

type Route = { kind: "packages" } | { kind: "package"; name: string } | { kind: "tokens" } | { kind: "not-found" };

const matchRoute = (path: string): Route => {
	if (path === "/" || path === "/packages") {
		return { kind: "packages" };
	}

	const packageMatch = path.match(/^\/packages\/([^/]+)$/);

	if (packageMatch?.[1]) {
		return { kind: "package", name: decodeURIComponent(packageMatch[1]) };
	}

	if (path === "/tokens") {
		return { kind: "tokens" };
	}

	return { kind: "not-found" };
};

let route = $derived(matchRoute(router.path));

const identity = api.me();
</script>

<svelte:document onclick={handleLinkClick} />

<div class="min-h-screen bg-background text-foreground">
	<header class="border-b">
		<div class="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:gap-6">
			<a href={router.resolve("/packages")} class="flex items-center gap-2 font-semibold">
				<span class="text-base font-semibold tracking-tight">Firestash</span>
			</a>
			<nav aria-label="Main" class="flex items-center gap-1">
				{#each navigation as item (item.href)}
					{@const active = item.isActive(router.path)}
					<a
						href={router.resolve(item.href)}
						aria-current={active ? "page" : undefined}
						class={[
							"flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
							active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
						]}
					>
						<item.icon class="size-4" />
						{item.label}
					</a>
				{/each}
			</nav>
			<div class="ml-auto min-w-0 truncate text-sm text-muted-foreground">
				{#await identity then me}
					{me.email ?? me.subject}
				{:catch}
					<span class="sr-only">Not signed in</span>
				{/await}
			</div>
		</div>
	</header>
	<main class="mx-auto max-w-6xl px-4 py-6">
		{#if route.kind === "packages"}
			<PackagesPage />
		{:else if route.kind === "package"}
			{#key route.name}
				<PackagePage name={route.name} />
			{/key}
		{:else if route.kind === "tokens"}
			<TokensPage />
		{:else}
			<NotFoundPage />
		{/if}
	</main>
</div>
