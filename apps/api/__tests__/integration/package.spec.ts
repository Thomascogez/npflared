import { env, fetchMock, SELF } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import packagePublishPayload from "../mocks/package-publish-payload.json";
import { createToken, publishMockPackage } from "../utils";

describe("package routes", () => {
	beforeAll(() => {
		fetchMock.activate();
		fetchMock.disableNetConnect();
	});

	afterEach(() => fetchMock.assertNoPendingInterceptors());

	describe("PUT /:package", () => {
		it("should not publish a package without being authenticated", async () => {
			const response = await SELF.fetch("http://localhost/mock", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(packagePublishPayload)
			});

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not publish a package with an invalid token", async () => {
			const response = await SELF.fetch("http://localhost/mock", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer invalid_token"
				},
				body: JSON.stringify(packagePublishPayload)
			});

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not publish a package with a token that does not have write access for provided package", async () => {
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:write", values: ["test-package"] }]
			});

			const response = await SELF.fetch("http://localhost/mock", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(packagePublishPayload)
			});

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not publish a package with a token that only has read access for provided package", async () => {
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:read", values: ["mock"] }]
			});

			const response = await SELF.fetch("http://localhost/mock", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(packagePublishPayload)
			});

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not publish package when providing an empty dist-tags", async () => {
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:write", values: ["mock"] }]
			});

			const response = await SELF.fetch("http://localhost/mock", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					...packagePublishPayload,
					"dist-tags": {}
				})
			});

			expect(response.status).toBe(400);
			expect(response.statusText).toBe("Bad Request");

			const responseBody = await response.text();
			expect(responseBody, "No tag");
		});

		it("should not publish package without providing a version", async () => {
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:write", values: ["mock"] }]
			});

			const response = await SELF.fetch("http://localhost/mock", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					...packagePublishPayload,
					versions: {}
				})
			});

			expect(response.status).toBe(400);
			expect(response.statusText).toBe("Bad Request");

			const responseBody = await response.text();
			expect(responseBody, "No version to upload");
		});

		it("should not publish package without providing an attachment", async () => {
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:write", values: ["mock"] }]
			});

			const response = await SELF.fetch("http://localhost/mock", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					...packagePublishPayload,
					_attachments: {}
				})
			});

			expect(response.status).toBe(400);
			expect(response.statusText).toBe("Bad Request");

			const responseBody = await response.text();
			expect(responseBody, "No attachment");
		});

		it("should not publish package with an invalid attachment name", async () => {
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:write", values: ["mock"] }]
			});

			const response = await SELF.fetch("http://localhost/mock", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					...packagePublishPayload,
					_attachments: {
						"not-matching-1.0.0.tgz": {}
					}
				})
			});

			expect(response.status).toBe(400);
			expect(response.statusText).toBe("Bad Request");

			const responseBody = await response.text();
			expect(responseBody, "Attachment name does not match");
		});

		it("should not publish package with an invalid tarball link", async () => {
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:write", values: ["mock"] }]
			});

			const response = await SELF.fetch("http://localhost/mock", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					...packagePublishPayload,
					versions: {
						"1.0.0": {
							...packagePublishPayload.versions["1.0.0"],
							dist: {
								...packagePublishPayload.versions["1.0.0"].dist,
								tarball: "http://localhost:8787/mock/-/not-matching-1.0.0.tgz"
							}
						}
					}
				})
			});

			expect(response.status).toBe(400);
			expect(response.statusText).toBe("Bad Request");

			const responseBody = await response.text();
			expect(responseBody, "Attachment name does not match");
		});

		it("should publish a package", async () => {
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:write", values: ["mock"] }]
			});

			const response = await SELF.fetch("http://localhost/mock", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(packagePublishPayload)
			});

			expect(response.status).toBe(200);

			const responseBody = await response.json();

			expect(responseBody).to.have.property("message").to.be.a("string").to.equal("ok");
		});

		it("should not publish same package version twice", async () => {
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:write", values: ["mock"] }]
			});

			const firstPublishResponse = await SELF.fetch("http://localhost/mock", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(packagePublishPayload)
			});

			expect(firstPublishResponse.status).toBe(200);

			const firstPublishResponseBody = await firstPublishResponse.json();

			expect(firstPublishResponseBody).to.have.property("message").to.be.a("string").to.equal("ok");

			const secondPublishResponse = await SELF.fetch("http://localhost/mock", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(packagePublishPayload)
			});

			expect(secondPublishResponse.status).toBe(409);
			expect(secondPublishResponse.statusText).toBe("Conflict");

			const secondPublishResponseBody = await secondPublishResponse.text();
			expect(secondPublishResponseBody, "Version already exists");
		});

		it("should publish two different versions of the same package", async () => {
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:write", values: ["mock"] }]
			});

			const firstPublishResponse = await SELF.fetch("http://localhost/mock", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(packagePublishPayload)
			});

			expect(firstPublishResponse.status).toBe(200);

			const firstPublishResponseBody = await firstPublishResponse.json();

			expect(firstPublishResponseBody).to.have.property("message").to.be.a("string").to.equal("ok");

			const secondPublishResponse = await SELF.fetch("http://localhost/mock", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(packagePublishPayload).replaceAll("1.0.0", "2.0.0")
			});

			expect(secondPublishResponse.status).toBe(200);

			const secondPublishResponseBody = await secondPublishResponse.json();
			expect(secondPublishResponseBody).to.have.property("message").to.be.a("string").to.equal("ok");
		});
	});

	describe("GET /:package", () => {
		it("should not get a package without being authenticated", async () => {
			await publishMockPackage();
			const response = await SELF.fetch("http://localhost/mock");

			expect(response.status).toBe(403);
			expect(response.statusText).to.be.a("string").to.equal("Forbidden");
		});

		it("should not get a package with an invalid token", async () => {
			await publishMockPackage();
			const response = await SELF.fetch("http://localhost/mock", {
				headers: {
					Authorization: "Bearer invalid_token"
				}
			});

			expect(response.status).toBe(403);
			expect(response.statusText).to.be.a("string").to.equal("Forbidden");
		});

		it("should not get a package with a token that does not have read access for provided package", async () => {
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:read", values: ["an-another-package"] }]
			});

			await publishMockPackage();

			const response = await SELF.fetch("http://localhost/mock", {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			expect(response.status).toBe(403);
			expect(response.statusText).to.be.a("string").to.equal("Forbidden");
		});

		it("should not get a package with a token that only has write access for provided package", async () => {
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:write", values: ["mock"] }]
			});

			await publishMockPackage();

			const response = await SELF.fetch("http://localhost/mock", {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			expect(response.status).toBe(403);
			expect(response.statusText).to.be.a("string").to.equal("Forbidden");
		});

		it("should get a package", async () => {
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:read+write", values: ["mock"] }]
			});

			await publishMockPackage();

			const response = await SELF.fetch("http://localhost/mock", {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			expect(response.status).toBe(200);

			const responseBody = await response.json();

			expect(responseBody).to.have.property("name").to.be.a("string").to.equal(packagePublishPayload.name);
			expect(responseBody).to.have.property("_id").to.be.a("string").to.equal(packagePublishPayload._id);
			expect(responseBody).to.have.property("dist-tags").to.be.deep.equal(packagePublishPayload["dist-tags"]);
			expect(responseBody).to.have.property("versions").to.be.deep.equal(packagePublishPayload.versions);
		});

		it("should get a package that does not belong to the local registry and fallback to the fallback registry", async () => {
			fetchMock.get(env.FALLBACK_REGISTRY_ENDPOINT).intercept({ path: "/use-discosable" }).reply(200);

			const response = await SELF.fetch("http://localhost/use-discosable");
			expect(response.status).toBe(200);
		});
	});

	describe("GET /:packageName/-/:tarballName", () => {
		it("should not get a package tarball without being authenticated", async () => {
			await publishMockPackage();

			const response = await SELF.fetch("http://localhost/mock/-/mock-1.0.0.tgz");

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not get a package tarball with an invalid token", async () => {
			await publishMockPackage();

			const response = await SELF.fetch("http://localhost/mock/-/mock-1.0.0.tgz", {
				headers: {
					Authorization: "Bearer invalid_token"
				}
			});

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not get a package tarball with a token that does not have read access for provided package", async () => {
			await publishMockPackage();

			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:read", values: ["an-another-package"] }]
			});

			const response = await SELF.fetch("http://localhost/mock/-/mock-1.0.0.tgz", {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not get a package tarball with a token that only has write access for provided package", async () => {
			await publishMockPackage();
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:write", values: ["mock"] }]
			});

			const response = await SELF.fetch("http://localhost/mock/-/mock-1.0.0.tgz", {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not get package tarball of a package that does not exist", async () => {
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:read", values: ["mock"] }]
			});

			const response = await SELF.fetch("http://localhost/mock/-/mock-1.0.0.tgz", {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			expect(response.status).toBe(404);
			expect(response.statusText).toBe("Not Found");
		});

		it("should get a package tarball", async () => {
			await publishMockPackage();
			const { token } = await createToken({
				name: "test-token",
				scopes: [{ type: "package:read+write", values: ["mock"] }]
			});

			const response = await SELF.fetch("http://localhost/mock/-/mock-1.0.0.tgz", {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});

			expect(response.status).toBe(200);
			const body = await response.arrayBuffer();

			expect(body).toBeDefined();
		});
	});
});
