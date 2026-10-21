<script lang="ts">
import type { TokenScope } from "$lib/api";
import { Badge } from "$lib/components/ui/badge/index.js";

let { scopes }: { scopes: TokenScope[] } = $props();

const describeValues = (values: string[]) => (values.includes("*") ? "all" : values.join(", "));
</script>

<div class="flex flex-wrap gap-1">
	{#each scopes as scope, index (index)}
		<Badge variant="outline" class="font-normal">
			<span class="font-medium">{scope.type}</span>
			<span class="text-muted-foreground">·</span>
			<span>{describeValues(scope.values)}</span>
		</Badge>
	{/each}
</div>
