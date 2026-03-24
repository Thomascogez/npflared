import { env, fetchMock, SELF } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createToken } from "../utils";
import packagePublishPayload from "../mocks/package-publish-payload.json";

describe("Permission Matrix", () => {
	beforeAll(() => {
		fetchMock.activate();
		fetchMock.disableNetConnect();
	});

	afterEach(() => fetchMock.assertNoPendingInterceptors());

	const scenarios = [
		{
			name: "Read-only for one package",
			tokenScopes: [{ type: "package:read", values: ["pkg-a"] }],
			checks: [
				{ path: "/pkg-a", method: "GET", expectedStatus: 200 },
				{ path: "/pkg-b", method: "GET", expectedStatus: 403 },
				{ path: "/pkg-a", method: "PUT", expectedStatus: 403 }
			]
		},
		{
			name: "Read-only for scoped package",
			tokenScopes: [{ type: "package:read", values: ["@scope/pkg-a"] }],
			checks: [
				{ path: "/@scope/pkg-a", method: "GET", expectedStatus: 200 },
				{ path: "/@scope/pkg-b", method: "GET", expectedStatus: 403 },
				{ path: "/pkg-a", method: "GET", expectedStatus: 403 }
			]
		},
		{
			name: "Read+Write for multiple packages",
			tokenScopes: [{ type: "package:read+write", values: ["pkg-a", "@scope/pkg-b"] }],
			checks: [
				{ path: "/pkg-a", method: "GET", expectedStatus: 200 },
				{ path: "/pkg-a", method: "PUT", expectedStatus: 200, version: "2.0.0" },
				{ path: "/@scope/pkg-b", method: "GET", expectedStatus: 200 },
				{ path: "/@scope/pkg-b", method: "PUT", expectedStatus: 200, version: "2.0.0" },
				{ path: "/pkg-c", method: "GET", expectedStatus: 403 }
			]
		},
		{
			name: "Glob pattern for scope",
			tokenScopes: [{ type: "package:read", values: ["@scope/*"] }],
			checks: [
				{ path: "/@scope/pkg-a", method: "GET", expectedStatus: 200 },
				{ path: "/@scope/pkg-b", method: "GET", expectedStatus: 200 },
				{ path: "/@other/pkg-a", method: "GET", expectedStatus: 403 }
			]
		}
	];

	for (const scenario of scenarios) {
		describe(scenario.name, () => {
			it("should enforce the expected permissions", async () => {
				const { token } = await createToken({
					name: `token-${scenario.name.replace(/\s+/g, "-")}`,
					scopes: scenario.tokenScopes
				});

				for (const check of scenario.checks) {
					const fullName = check.path.startsWith("/") ? check.path.substring(1) : check.path;
					const version = check.version || "1.0.0";

					if (check.method === "GET") {
						const { token: adminToken } = await createToken({
							name: "admin",
							scopes: [{ type: "package:read+write", values: ["*"] }]
						});

						const payload = {
							...packagePublishPayload,
							_id: fullName,
							name: fullName,
							versions: {
								"1.0.0": {
									...packagePublishPayload.versions["1.0.0"],
									_id: `${fullName}@1.0.0`,
									name: fullName,
									dist: {
										...packagePublishPayload.versions["1.0.0"].dist,
										tarball: `http://localhost:8787/${fullName}/-/${fullName.replace("/", "-")}-1.0.0.tgz`
									}
								}
							},
							_attachments: {
								[`${fullName.replace("/", "-")}-1.0.0.tgz`]: packagePublishPayload._attachments["mock-1.0.0.tgz"]
							}
						};

						await SELF.fetch(`http://localhost/${fullName}`, {
							method: "PUT",
							headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
							body: JSON.stringify(payload)
						});
					}

					const response = await SELF.fetch(`http://localhost/${fullName}`, {
						method: check.method,
						headers: {
							Authorization: `Bearer ${token}`,
							...(check.method === "PUT" ? { "Content-Type": "application/json" } : {})
						},
						body:
							check.method === "PUT"
								? JSON.stringify({
										...packagePublishPayload,
										_id: fullName,
										name: fullName,
										versions: {
											[version]: {
												...packagePublishPayload.versions["1.0.0"],
												_id: `${fullName}@${version}`,
												name: fullName,
												version: version,
												dist: {
													...packagePublishPayload.versions["1.0.0"].dist,
													tarball: `http://localhost:8787/${fullName}/-/${fullName.replace("/", "-")}-${version}.tgz`
												}
											}
										},
										_attachments: {
											[`${fullName.replace("/", "-")}-${version}.tgz`]:
												packagePublishPayload._attachments["mock-1.0.0.tgz"]
										}
									})
								: undefined
					});

					expect(response.status, `Scenario: ${scenario.name}, Check: ${check.method} ${check.path}`).toBe(
						check.expectedStatus
					);
				}
			});
		});
	}
});
