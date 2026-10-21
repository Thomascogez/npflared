<script lang="ts">
import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
import * as Alert from "$lib/components/ui/alert/index.js";
import { Button } from "$lib/components/ui/button/index.js";
import { errorMessage } from "$lib/format";

let { error, title = "Something went wrong", retry }: { error: unknown; title?: string; retry?: () => void } = $props();
</script>

<Alert.Root variant="destructive">
	<CircleAlertIcon />
	<Alert.Title>{title}</Alert.Title>
	<Alert.Description>
		<p>{errorMessage(error)}</p>
		{#if retry}
			<Button variant="outline" size="sm" class="mt-2" onclick={retry}>Try again</Button>
		{/if}
	</Alert.Description>
</Alert.Root>
