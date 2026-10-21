/** Prefix identifying firestash tokens, useful for secret scanning and recognisability. */
export const TOKEN_PREFIX = "fst_";

/** 256 bits of entropy per token. */
const TOKEN_BYTES = 32;

const toBase64Url = (bytes: Uint8Array) =>
	btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");

const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

/** Generates a new cryptographically secure plaintext token. */
export const generateToken = () => {
	const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
	return `${TOKEN_PREFIX}${toBase64Url(bytes)}`;
};

/** Returns the SHA-256 hex digest of a plaintext token, which is what gets persisted. */
export const hashToken = async (token: string) => {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
	return toHex(new Uint8Array(digest));
};
