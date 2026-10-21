<script lang="ts">
import CheckIcon from "@lucide/svelte/icons/check";
import CopyIcon from "@lucide/svelte/icons/copy";
import { Button, type ButtonProps } from "$lib/components/ui/button/index.js";

let {
	value,
	label = "Copy",
	variant = "outline",
	size = "sm",
	...restProps
}: { value: string; label?: string } & Omit<ButtonProps, "onclick" | "children"> = $props();

let copied = $state(false);
let resetTimer: ReturnType<typeof setTimeout> | undefined;

const copy = async () => {
	await navigator.clipboard.writeText(value);
	copied = true;
	clearTimeout(resetTimer);
	resetTimer = setTimeout(() => {
		copied = false;
	}, 2000);
};
</script>

<Button {variant} {size} onclick={copy} aria-live="polite" {...restProps}>
	{#if copied}
		<CheckIcon />
		Copied
	{:else}
		<CopyIcon />
		{label}
	{/if}
</Button>
