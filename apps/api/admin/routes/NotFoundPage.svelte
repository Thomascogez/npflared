<script lang="ts">
import EmptyState from "$lib/components/EmptyState.svelte";
import { Button } from "$lib/components/ui/button/index.js";
import { router } from "$lib/router.svelte";
</script>

<EmptyState title="Page not found" description="There is nothing at this address.">
	<Button variant="outline" href={router.resolve("/packages")}>Back to packages</Button>
</EmptyState>
