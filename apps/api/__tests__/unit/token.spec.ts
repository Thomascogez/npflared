import { describe, expect, it } from "vitest";
import { generateToken, hashToken, TOKEN_PREFIX } from "../../src/utils/token";

describe("token utils", () => {
	describe("generateToken", () => {
		it("should generate a prefixed token carrying at least 256 bits of entropy", () => {
			const token = generateToken();

			expect(token.startsWith(TOKEN_PREFIX)).toBe(true);

			const secret = token.slice(TOKEN_PREFIX.length);
			// 32 random bytes encoded as unpadded base64url
			expect(secret).toHaveLength(43);
			expect(secret).toMatch(/^[A-Za-z0-9_-]+$/);
		});

		it("should generate unique tokens", () => {
			const tokens = new Set(Array.from({ length: 100 }, () => generateToken()));
			expect(tokens.size).toBe(100);
		});
	});

	describe("hashToken", () => {
		it("should return the SHA-256 hex digest of the token", async () => {
			await expect(hashToken("abc")).resolves.toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
		});

		it("should be deterministic", async () => {
			const token = generateToken();
			expect(await hashToken(token)).toBe(await hashToken(token));
		});

		it("should never contain the plaintext token", async () => {
			const token = generateToken();
			const hash = await hashToken(token);

			expect(hash).not.toContain(token.slice(TOKEN_PREFIX.length));
			expect(hash).toMatch(/^[0-9a-f]{64}$/);
		});
	});
});
