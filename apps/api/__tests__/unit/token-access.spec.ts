import { describe, expect, it } from "vitest";
import type { tokenTable } from "../../src/db/schema";
import { assertTokenAccess } from "../../src/utils/access";

type Token = typeof tokenTable.$inferSelect;

describe("assetTokenAccess", () => {
	describe("Check read only access", () => {
		const readOnlyAccessToken: Token = {
			name: "test-token",
			token: "test-token",
			createdAt: Date.now(),
			updatedAt: Date.now(),
			scopes: [{ type: "package:read", values: ["test-package"] }]
		};

		const writeOnlyAccessToken: Token = {
			name: "test-token",
			token: "test-token",
			createdAt: Date.now(),
			updatedAt: Date.now(),
			scopes: [{ type: "package:write", values: ["test-package"] }]
		};

		const readWriteAccessToken: Token = {
			name: "test-token",
			token: "test-token",
			createdAt: Date.now(),
			updatedAt: Date.now(),
			scopes: [{ type: "package:read+write", values: ["test-package"] }]
		};

		const readOnlyAccessTokenWildcardAccess: Token = {
			name: "test-token",
			token: "test-token",
			createdAt: Date.now(),
			updatedAt: Date.now(),
			scopes: [{ type: "package:read", values: ["*"] }]
		};

		it("should not allow package read access when token has no access for provided package", () => {
			const access = assertTokenAccess(readOnlyAccessToken);
			expect(access("read", "package", "test-package-not-allowed")).toBe(false);
		});

		it("should not allow package read access when token has only write access for provided package", () => {
			const access = assertTokenAccess(writeOnlyAccessToken);
			expect(access("read", "package", "test-package-not-allowed")).toBe(false);
		});

		it("should allow package read access when token has access for provided package", () => {
			const access = assertTokenAccess(readOnlyAccessToken);
			expect(access("read", "package", "test-package")).toBe(true);
		});

		it("should allow package read access when token has wildcard access", () => {
			const access = assertTokenAccess(readOnlyAccessTokenWildcardAccess);
			expect(access("read", "package", "test-package")).toBe(true);
		});

		it("should allow package when token has read+write access", () => {
			const access = assertTokenAccess(readWriteAccessToken);
			expect(access("read", "package", "test-package")).toBe(true);
		});
	});

	describe("Check write only access", () => {
		const readOnlyAccessToken: Token = {
			name: "test-token",
			token: "test-token",
			createdAt: Date.now(),
			updatedAt: Date.now(),
			scopes: [{ type: "package:read", values: ["test-package"] }]
		};

		const writeOnlyAccessToken: Token = {
			name: "test-token",
			token: "test-token",
			createdAt: Date.now(),
			updatedAt: Date.now(),
			scopes: [{ type: "package:write", values: ["test-package"] }]
		};

		const readWriteAccessToken: Token = {
			name: "test-token",
			token: "test-token",
			createdAt: Date.now(),
			updatedAt: Date.now(),
			scopes: [{ type: "package:read+write", values: ["test-package"] }]
		};

		const readOnlyAccessTokenWildcardAccess: Token = {
			name: "test-token",
			token: "test-token",
			createdAt: Date.now(),
			updatedAt: Date.now(),
			scopes: [{ type: "package:read", values: ["*"] }]
		};

		const writeOnlyAccessTokenWildcardAccess: Token = {
			name: "test-token",
			token: "test-token",
			createdAt: Date.now(),
			updatedAt: Date.now(),
			scopes: [{ type: "package:write", values: ["*"] }]
		};
		it("should not allow package write access when token has no access for provided package", () => {
			const access = assertTokenAccess(writeOnlyAccessToken);
			expect(access("write", "package", "test-package-not-allowed")).toBe(false);
		});

		it("should not allow package write access when token has only read access for provided package", () => {
			const access = assertTokenAccess(readOnlyAccessToken);
			expect(access("write", "package", "test-package")).toBe(false);
		});

		it("should not allow package write access when token has wildcard access with only read access", () => {
			const access = assertTokenAccess(readOnlyAccessTokenWildcardAccess);
			expect(access("write", "package", "test-package")).toBe(false);
		});

		it("should allow package write when the token has write access for provided package", () => {
			const access = assertTokenAccess(writeOnlyAccessToken);
			expect(access("write", "package", "test-package")).toBe(true);
		});

		it("should allow package write access when token has read+write access", () => {
			const access = assertTokenAccess(readWriteAccessToken);
			expect(access("write", "package", "test-package")).toBe(true);
		});

		it("should allow package write access when token has wildcard access", () => {
			const access = assertTokenAccess(writeOnlyAccessTokenWildcardAccess);
			expect(access("write", "package", "test-package")).toBe(true);
		});

		it("should not allow package write access when token has only read access for provided package", () => {
			const access = assertTokenAccess(readOnlyAccessToken);
			expect(access("write", "package", "test-package-not-allowed")).toBe(false);
		});

		it("should allow package write access when token has access for provided package", () => {
			const access = assertTokenAccess(writeOnlyAccessToken);
			expect(access("write", "package", "test-package")).toBe(true);
		});
	});
});
