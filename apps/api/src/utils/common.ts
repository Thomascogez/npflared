export const base64ToReadableStream = (
	input: string,
	options?: {
		chunkSize?: number;
	}
): ReadableStream<Uint8Array> => {
	const chunkSize = options?.chunkSize ?? 64 * 1024;

	if (chunkSize % 4 !== 0) {
		throw new Error("chunkSize must be a multiple of 4");
	}

	const base64 = input.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");

	let offset = 0;

	return new ReadableStream<Uint8Array>({
		pull(controller) {
			if (offset >= base64.length) {
				controller.close();
				return;
			}

			const end = Math.min(offset + chunkSize, base64.length);
			const slice = base64.slice(offset, end);
			offset = end;

			const binary = atob(slice);
			const bytes = new Uint8Array(binary.length);

			for (let i = 0; i < binary.length; i++) {
				bytes[i] = binary.charCodeAt(i);
			}

			controller.enqueue(bytes);
		}
	});
};
