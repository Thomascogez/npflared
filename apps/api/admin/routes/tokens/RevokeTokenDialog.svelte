<script lang="ts">
import { api, type Token } from "$lib/api";
import * as Alert from "$lib/components/ui/alert/index.js";
import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
import { Button } from "$lib/components/ui/button/index.js";
import { errorMessage } from "$lib/format";

let { token, onclose, onrevoked }: { token: Token | null; onclose: () => void; onrevoked: () => void } = $props();

let revoking = $state(false);
let error = $state<string | null>(null);

const revoke = async () => {
	if (!token) {
		return;
	}

	revoking = true;
	error = null;

	try {
		await api.revokeToken(token.id);
		onrevoked();
		onclose();
	} catch (cause) {
		error = errorMessage(cause);
	} finally {
		revoking = false;
	}
};
</script>

<AlertDialog.Root
	open={token !== null}
	onOpenChange={(isOpen) => {
		if (!isOpen) {
			error = null;
			onclose();
		}
	}}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Revoke “{token?.name}”?</AlertDialog.Title>
			<AlertDialog.Description>
				Clients using this token lose access immediately. This cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		{#if error}
			<Alert.Root variant="destructive">
				<Alert.Title>Could not revoke the token</Alert.Title>
				<Alert.Description>{error}</Alert.Description>
			</Alert.Root>
		{/if}
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={revoking}>Cancel</AlertDialog.Cancel>
			<Button variant="destructive" disabled={revoking} onclick={revoke}>
				{revoking ? "Revoking…" : "Revoke token"}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
