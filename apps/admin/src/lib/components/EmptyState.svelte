<script lang="ts">
import type { Snippet } from "svelte";

let { title, description, children }: { title: string; description?: string; children?: Snippet } = $props();
</script>

<div class="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-16 text-center">
	<p class="font-medium">{title}</p>
	{#if description}
		<p class="max-w-md text-sm text-muted-foreground">{description}</p>
	{/if}
	{#if children}
		<div class="mt-2">{@render children()}</div>
	{/if}
</div>
