import { env, fetchMock } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { PublicToken } from "../../src/services/token-service";
import { hashToken, TOKEN_PREFIX } from "../../src/utils/token";
import {
	createAdminHeaders,
	createPublishPayload,
	createToken,
	httpTestClient,
	publishMockPackage,
	publishPackage
} from "../utils";

const scopedPackageName = "@mock/scoped";

/** Publishes with a wildcard token, the way the registry would be fed before an administrator looks at it. */
const publish = async (packageName: string, ...args: Parameters<typeof createPublishPayload>) => {
	const { token } = await createToken();
	const response = await publishPackage(packageName, createPublishPayload(...args), token);

	expect(response.status).toBe(200);
};

/** Guarantees distinct publication timestamps, which the version ordering relies on. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 2));

const listPackages = async (query: Record<string, string> = {}) =>
	httpTestClient._.admin.api.packages.$get({ query }, { headers: await createAdminHeaders() });

describe("admin API", () => {
	beforeAll(() => {
		fetchMock.activate();
		fetchMock.disableNetConnect();
	});

	afterEach(() => fetchMock.assertNoPendingInterceptors());

	describe("GET /_/admin/api/packages", () => {
		it("should require Cloudflare Access", async () => {
			const response = await httpTestClient._.admin.api.packages.$get({ query: {} });

			expect(response.status).toBe(401);
		});

		it("should return an empty page when nothing is published", async () => {
			const response = await listPackages();

			expect(response.status).toBe(200);
			expect(await response.json()).to.deep.equal({ items: [], total: 0, page: 1, limit: 20 });
		});

		it("should list packages alphabetically with their latest version and version count", async () => {
			await publishMockPackage();
			await publish("mock", "mock", "2.0.0", { next: "2.0.0" });
			await publish("@mock%2fscoped", scopedPackageName);
			await publish("another", "another");

			const response = await listPackages();
			expect(response.status).toBe(200);

			const page = await response.json();
			expect(page).to.include({ total: 3, page: 1, limit: 20 });
			expect(page.items.map(({ name }) => name)).to.deep.equal([scopedPackageName, "another", "mock"]);

			const mock = page.items.find(({ name }) => name === "mock");
			expect(mock).to.include({ latestVersion: "1.0.0", versionCount: 2 });
			expect(mock?.distTags).to.deep.equal({ latest: "1.0.0", next: "2.0.0" });
			expect(mock?.createdAt).to.be.a("number");
			expect(mock?.updatedAt).to.be.a("number");

			const scoped = page.items.find(({ name }) => name === scopedPackageName);
			expect(scoped).to.include({ latestVersion: "1.0.0", versionCount: 1 });
		});

		it("should search package names case-insensitively and literally", async () => {
			await publishMockPackage();
			await publish("@mock%2fscoped", scopedPackageName);
			await publish("another", "another");

			const lowercase = await (await listPackages({ search: "mock" })).json();
			expect(lowercase.total).toBe(2);
			expect(lowercase.items.map(({ name }) => name)).to.deep.equal([scopedPackageName, "mock"]);

			const uppercase = await (await listPackages({ search: "MOCK" })).json();
			expect(uppercase.total).toBe(2);

			const scope = await (await listPackages({ search: "@mock/" })).json();
			expect(scope.items.map(({ name }) => name)).to.deep.equal([scopedPackageName]);

			for (const wildcard of ["%", "_", "m%k"]) {
				const literal = await (await listPackages({ search: wildcard })).json();
				expect(literal.total, wildcard).toBe(0);
			}
		});

		it("should paginate", async () => {
			await publishMockPackage();
			await publish("@mock%2fscoped", scopedPackageName);
			await publish("another", "another");

			const secondPage = await (await listPackages({ limit: "1", page: "2" })).json();
			expect(secondPage).to.include({ total: 3, page: 2, limit: 1 });
			expect(secondPage.items.map(({ name }) => name)).to.deep.equal(["another"]);

			const beyond = await (await listPackages({ limit: "2", page: "3" })).json();
			expect(beyond.items).to.deep.equal([]);
			expect(beyond.total).toBe(3);
		});

		it("should reject invalid pagination", async () => {
			const invalidQueries: Record<string, string>[] = [
				{ page: "0" },
				{ limit: "0" },
				{ limit: "101" },
				{ page: "abc" }
			];

			for (const query of invalidQueries) {
				const response = await listPackages(query);

				expect(response.status, JSON.stringify(query)).toBe(400);
			}
		});
	});

	describe("GET /_/admin/api/packages/:packageName", () => {
		it("should require Cloudflare Access", async () => {
			const response = await httpTestClient._.admin.api.packages[":packageName"].$get({
				param: { packageName: "mock" }
			});

			expect(response.status).toBe(401);
		});

		it("should not find an unpublished package", async () => {
			const response = await httpTestClient._.admin.api.packages[":packageName"].$get(
				{ param: { packageName: "mock" } },
				{ headers: await createAdminHeaders() }
			);

			expect(response.status).toBe(404);
		});

		it("should describe a package with its dist-tags and versions, newest first", async () => {
			await publish("mock", "mock", "1.0.0", { latest: "1.0.0" }, { description: "A mock package" });
			await tick();
			await publish("mock", "mock", "2.0.0", { next: "2.0.0" }, { description: "A newer mock package" });

			const response = await httpTestClient._.admin.api.packages[":packageName"].$get(
				{ param: { packageName: "mock" } },
				{ headers: await createAdminHeaders() }
			);

			expect(response.status).toBe(200);

			const details = await response.json();
			expect(details).to.include({ name: "mock", description: "A mock package", latestVersion: "1.0.0" });
			expect(details.distTags).to.deep.equal({ latest: "1.0.0", next: "2.0.0" });
			expect(details.versions.map(({ version }) => version)).to.deep.equal(["2.0.0", "1.0.0"]);
			expect(details.versions.map(({ tag }) => tag)).to.deep.equal(["next", "latest"]);
			for (const version of details.versions) {
				expect(version.createdAt).to.be.a("number");
			}
			expect(details.createdAt).to.be.a("number");
			expect(details.updatedAt).to.be.a("number");
			expect(details).not.to.have.property("readme");
		});

		it("should describe a scoped package from its URL-encoded name", async () => {
			await publish("@mock%2fscoped", scopedPackageName);

			const response = await httpTestClient._.admin.api.packages[":packageName"].$get(
				{ param: { packageName: encodeURIComponent(scopedPackageName) } },
				{ headers: await createAdminHeaders() }
			);

			expect(response.status).toBe(200);
			expect(await response.json()).to.include({ name: scopedPackageName, description: null, latestVersion: "1.0.0" });
		});
	});

	describe("GET /_/admin/api/packages/:packageName/versions/:version", () => {
		it("should require Cloudflare Access", async () => {
			const response = await httpTestClient._.admin.api.packages[":packageName"].versions[":version"].$get({
				param: { packageName: "mock", version: "1.0.0" }
			});

			expect(response.status).toBe(401);
		});

		it("should not find an unpublished version", async () => {
			await publishMockPackage();

			const response = await httpTestClient._.admin.api.packages[":packageName"].versions[":version"].$get(
				{ param: { packageName: "mock", version: "3.0.0" } },
				{ headers: await createAdminHeaders() }
			);

			expect(response.status).toBe(404);
		});

		it("should reject a version that is not semver", async () => {
			const response = await httpTestClient._.admin.api.packages[":packageName"].versions[":version"].$get(
				{ param: { packageName: "mock", version: "latest" } },
				{ headers: await createAdminHeaders() }
			);

			expect(response.status).toBe(400);
		});

		it("should return the manifest as published, with its readme and dependencies", async () => {
			const manifest = {
				description: "A mock package",
				readme: "# mock\n\nHello",
				dependencies: { hono: "^4.0.0" },
				devDependencies: { vitest: "^3.0.0" }
			};
			await publish("@mock%2fscoped", scopedPackageName, "1.0.0", { latest: "1.0.0" }, manifest);

			const response = await httpTestClient._.admin.api.packages[":packageName"].versions[":version"].$get(
				{ param: { packageName: encodeURIComponent(scopedPackageName), version: "1.0.0" } },
				{ headers: await createAdminHeaders() }
			);

			expect(response.status).toBe(200);

			const packageVersion = await response.json();
			expect(packageVersion).to.include({ version: "1.0.0", tag: "latest" });
			expect(packageVersion.createdAt).to.be.a("number");
			expect(packageVersion.manifest).to.include({
				name: scopedPackageName,
				version: "1.0.0",
				readme: manifest.readme
			});
			expect(packageVersion.manifest.dependencies).to.deep.equal(manifest.dependencies);
			expect(packageVersion.manifest.devDependencies).to.deep.equal(manifest.devDependencies);
			expect(packageVersion.manifest.peerDependencies).to.deep.equal({ react: "^19.0.0" });
			expect(packageVersion.manifest).to.have.property("license", "MIT");
		});
	});

	describe("tokens", () => {
		it("should require Cloudflare Access on every token endpoint", async () => {
			const responses = await Promise.all([
				httpTestClient._.admin.api.tokens.$get(),
				httpTestClient._.admin.api.tokens.$post({
					json: { name: "t", scopes: [{ type: "package:read", values: ["*"] }] }
				}),
				httpTestClient._.admin.api.tokens[":id"].$get({ param: { id: env.ADMIN_TOKEN_ID } }),
				httpTestClient._.admin.api.tokens[":id"].$delete({ param: { id: env.ADMIN_TOKEN_ID } })
			]);

			for (const response of responses) {
				expect(response.status).toBe(401);
			}
		});

		it("should list tokens without exposing any secret", async () => {
			const created = await createToken();

			const response = await httpTestClient._.admin.api.tokens.$get({}, { headers: await createAdminHeaders() });
			expect(response.status).toBe(200);

			const tokens = (await response.json()) as PublicToken[];
			expect(tokens.map(({ id }) => id)).to.include.members([env.ADMIN_TOKEN_ID, created.id]);

			const serialized = JSON.stringify(tokens);
			expect(serialized).not.toContain(created.token);
			expect(serialized).not.toContain(env.ADMIN_TOKEN);
			expect(serialized).not.toContain(await hashToken(created.token));
		});

		it("should create a token usable against the registry and return its plaintext once", async () => {
			const body = { name: "created-by-admin", scopes: [{ type: "token:read" as const, values: ["*"] }] };

			const response = await httpTestClient._.admin.api.tokens.$post(
				{ json: body },
				{ headers: await createAdminHeaders() }
			);
			expect(response.status).toBe(201);

			const created = await response.json();
			expect(created).to.include({ name: body.name });
			expect(created.scopes).to.deep.equal(body.scopes);
			expect(created.token.startsWith(TOKEN_PREFIX)).toBe(true);

			const registryResponse = await httpTestClient["-"].npm.v1.tokens.$get(
				{},
				{ headers: { Authorization: `Bearer ${created.token}` } }
			);
			expect(registryResponse.status).toBe(200);

			const fetched = await httpTestClient._.admin.api.tokens[":id"].$get(
				{ param: { id: created.id } },
				{ headers: await createAdminHeaders() }
			);
			expect(fetched.status).toBe(200);
			expect(await fetched.json()).to.deep.equal({
				id: created.id,
				name: created.name,
				scopes: created.scopes,
				createdAt: created.createdAt,
				updatedAt: created.updatedAt
			});
		});

		it("should validate the token to create", async () => {
			const response = await httpTestClient._.admin.api.tokens.$post(
				{ json: { name: "invalid", scopes: [] } },
				{ headers: await createAdminHeaders() }
			);

			expect(response.status).toBe(400);
		});

		it("should not find an unknown token", async () => {
			const response = await httpTestClient._.admin.api.tokens[":id"].$get(
				{ param: { id: "unknown" } },
				{ headers: await createAdminHeaders() }
			);

			expect(response.status).toBe(404);
		});

		it("should revoke a token", async () => {
			const { id, token } = await createToken({ name: "to-revoke", scopes: [{ type: "token:read", values: ["*"] }] });

			const response = await httpTestClient._.admin.api.tokens[":id"].$delete(
				{ param: { id } },
				{ headers: await createAdminHeaders() }
			);
			expect(response.status).toBe(200);
			expect(await response.json()).to.deep.equal({ message: "ok" });

			const registryResponse = await httpTestClient["-"].npm.v1.tokens.$get(
				{},
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			expect(registryResponse.status).toBe(403);

			const again = await httpTestClient._.admin.api.tokens[":id"].$delete(
				{ param: { id } },
				{ headers: await createAdminHeaders() }
			);
			expect(again.status).toBe(404);
		});
	});
});
