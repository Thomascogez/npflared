<script lang="ts">
import { Skeleton } from "$lib/components/ui/skeleton/index.js";

let { rows = 5, columns = 4 }: { rows?: number; columns?: number } = $props();
</script>

<div class="flex flex-col gap-3 rounded-xl border p-4" aria-busy="true" aria-label="Loading">
	{#each { length: rows } as _, row (row)}
		<div class="flex gap-6">
			{#each { length: columns } as _, column (column)}
				<Skeleton class={["h-4", column === 0 ? "w-48" : "w-20"]} />
			{/each}
		</div>
	{/each}
</div>
