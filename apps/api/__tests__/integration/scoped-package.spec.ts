import { env, fetchMock, SELF } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import packagePublishPayload from "../mocks/package-publish-payload.json";
import { createToken } from "../utils";

describe("scoped package routes", () => {
	beforeAll(() => {
		fetchMock.activate();
		fetchMock.disableNetConnect();
	});

	afterEach(() => fetchMock.assertNoPendingInterceptors());

	describe("GET /:packageScope/:packageName", () => {
		it("should match scoped package metadata route and fallback to external registry", async () => {
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:read", values: ["@test/pkg"] }]
			});

			fetchMock.get(env.FALLBACK_REGISTRY_ENDPOINT).intercept({ path: "/@test/pkg" }).reply(200, { name: "@test/pkg" });

			const response = await SELF.fetch("http://localhost/@test/pkg", {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body).toEqual({ name: "@test/pkg" });
		});

		it("should fallback to external registry without token being required for the fallback", async () => {
			fetchMock
				.get(env.FALLBACK_REGISTRY_ENDPOINT)
				.intercept({ path: "/@fallback/pkg" })
				.reply(200, { name: "@fallback/pkg" });

			const response = await SELF.fetch("http://localhost/@fallback/pkg");

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body).toEqual({ name: "@fallback/pkg" });
		});

		it("should return 403 if token doesn't have access to scoped package in local registry", async () => {
			const scopedPackagePayload = {
				...packagePublishPayload,
				_id: "@scoped/pkg",
				name: "@scoped/pkg",
				versions: {
					"1.0.0": {
						...packagePublishPayload.versions["1.0.0"],
						_id: "@scoped/pkg@1.0.0",
						name: "@scoped/pkg",
						dist: {
							...packagePublishPayload.versions["1.0.0"].dist,
							tarball: "http://localhost:8787/@scoped/pkg/-/@scoped-pkg-1.0.0.tgz"
						}
					}
				},
				_attachments: {
					"@scoped-pkg-1.0.0.tgz": packagePublishPayload._attachments["mock-1.0.0.tgz"]
				}
			};

			const { token: adminToken } = await createToken({
				name: "admin",
				scopes: [{ type: "package:read+write", values: ["*"] }]
			});

			// Publish scoped package
			const publishResponse = await SELF.fetch("http://localhost/@scoped/pkg", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${adminToken}`
				},
				body: JSON.stringify(scopedPackagePayload)
			});
			expect(publishResponse.status).toBe(200);

			const { token: userToken } = await createToken({
				name: "user",
				scopes: [{ type: "package:read", values: ["something-else"] }]
			});

			const response = await SELF.fetch("http://localhost/@scoped/pkg", {
				headers: {
					Authorization: `Bearer ${userToken}`
				}
			});

			expect(response.status).toBe(403);
		});

		it("should allow access if token has access to scoped package in local registry", async () => {
			const scopedPackagePayload = {
				...packagePublishPayload,
				_id: "@scoped/pkg-ok",
				name: "@scoped/pkg-ok",
				versions: {
					"1.0.0": {
						...packagePublishPayload.versions["1.0.0"],
						_id: "@scoped/pkg-ok@1.0.0",
						name: "@scoped/pkg-ok",
						dist: {
							...packagePublishPayload.versions["1.0.0"].dist,
							tarball: "http://localhost:8787/@scoped/pkg-ok/-/@scoped-pkg-ok-1.0.0.tgz"
						}
					}
				},
				_attachments: {
					"@scoped-pkg-ok-1.0.0.tgz": packagePublishPayload._attachments["mock-1.0.0.tgz"]
				}
			};

			const { token: adminToken } = await createToken({
				name: "admin",
				scopes: [{ type: "package:read+write", values: ["*"] }]
			});

			// Publish scoped package
			const publishResponse = await SELF.fetch("http://localhost/@scoped/pkg-ok", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${adminToken}`
				},
				body: JSON.stringify(scopedPackagePayload)
			});
			expect(publishResponse.status).toBe(200);

			const { token: userToken } = await createToken({
				name: "user",
				scopes: [{ type: "package:read", values: ["@scoped/pkg-ok"] }]
			});

			const response = await SELF.fetch("http://localhost/@scoped/pkg-ok", {
				headers: {
					Authorization: `Bearer ${userToken}`
				}
			});

			expect(response.status).toBe(200);
			const body = (await response.json()) as { name: string } | undefined;
			if (!body) return;
			expect(body.name).toBe("@scoped/pkg-ok");
		});
	});

	describe("GET /:packageScope/:packageName/-/:tarballName", () => {
		it("should allow downloading a scoped package tarball", async () => {
			const scopedPackagePayload = {
				...packagePublishPayload,
				_id: "@scoped/pkg-tarball",
				name: "@scoped/pkg-tarball",
				versions: {
					"1.0.0": {
						...packagePublishPayload.versions["1.0.0"],
						_id: "@scoped/pkg-tarball@1.0.0",
						name: "@scoped/pkg-tarball",
						dist: {
							...packagePublishPayload.versions["1.0.0"].dist,
							tarball: "http://localhost:8787/@scoped/pkg-tarball/-/@scoped-pkg-tarball-1.0.0.tgz"
						}
					}
				},
				_attachments: {
					"@scoped-pkg-tarball-1.0.0.tgz": packagePublishPayload._attachments["mock-1.0.0.tgz"]
				}
			};

			const { token: adminToken } = await createToken({
				name: "admin",
				scopes: [{ type: "package:read+write", values: ["*"] }]
			});

			// Publish scoped package
			const publishResponse = await SELF.fetch("http://localhost/@scoped/pkg-tarball", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${adminToken}`
				},
				body: JSON.stringify(scopedPackagePayload)
			});
			expect(publishResponse.status).toBe(200);

			const { token: userToken } = await createToken({
				name: "user",
				scopes: [{ type: "package:read", values: ["@scoped/pkg-tarball"] }]
			});

			const response = await SELF.fetch("http://localhost/@scoped/pkg-tarball/-/@scoped-pkg-tarball-1.0.0.tgz", {
				headers: {
					Authorization: `Bearer ${userToken}`
				}
			});

			expect(response.status).toBe(200);
			const blob = await response.blob();
			expect(blob.size).toBeGreaterThan(0);
		});
	});

	describe("403 Forbidden scenarios", () => {
		it("should match scoped package with @scope/* glob", async () => {
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:read+write", values: ["@babadeluxe/*"] }]
			});

			const scopedPackagePayload = {
				...packagePublishPayload,
				_id: "@babadeluxe/xo-config",
				name: "@babadeluxe/xo-config",
				versions: {
					"1.0.0": {
						...packagePublishPayload.versions["1.0.0"],
						_id: "@babadeluxe/xo-config@1.0.0",
						name: "@babadeluxe/xo-config",
						dist: {
							...packagePublishPayload.versions["1.0.0"].dist,
							tarball: "http://localhost:8787/@babadeluxe/xo-config/-/@babadeluxe-xo-config-1.0.0.tgz"
						}
					}
				},
				_attachments: {
					"@babadeluxe-xo-config-1.0.0.tgz": packagePublishPayload._attachments["mock-1.0.0.tgz"]
				}
			};

			const response = await SELF.fetch("http://localhost/@babadeluxe/xo-config", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(scopedPackagePayload)
			});

			expect(response.status).toBe(200);
		});

		it("should match scoped package with @scope** glob when slashes are allowed to cross", async () => {
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:read+write", values: ["@babadeluxe**"] }]
			});

			const scopedPackagePayload = {
				...packagePublishPayload,
				_id: "@babadeluxe/xo-config",
				name: "@babadeluxe/xo-config",
				versions: {
					"1.0.0": {
						...packagePublishPayload.versions["1.0.0"],
						_id: "@babadeluxe/xo-config@1.0.0",
						name: "@babadeluxe/xo-config",
						dist: {
							...packagePublishPayload.versions["1.0.0"].dist,
							tarball: "http://localhost:8787/@babadeluxe/xo-config/-/@babadeluxe-xo-config-1.0.0.tgz"
						}
					}
				},
				_attachments: {
					"@babadeluxe-xo-config-1.0.0.tgz": packagePublishPayload._attachments["mock-1.0.0.tgz"]
				}
			};

			const response = await SELF.fetch("http://localhost/@babadeluxe/xo-config", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(scopedPackagePayload)
			});

			expect(response.status).toBe(200);
		});
	});
});
