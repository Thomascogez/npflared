import { createExecutionContext, env, fetchMock } from "cloudflare:test";
import { env as workerEnv } from "cloudflare:workers";
import { sign } from "hono/jwt";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import app from "#index";
import {
	type AccessSigningKey,
	createAccessToken,
	createAdminHeaders,
	createAccessSigningKey as createSigningKey,
	getAccessSigningKey,
	httpTestClient,
	accessIssuer as issuer,
	mockAccessCerts
} from "../utils";

let signingKey: AccessSigningKey;

describe("admin authentication", () => {
	beforeAll(async () => {
		fetchMock.activate();
		fetchMock.disableNetConnect();

		signingKey = await getAccessSigningKey();
	});

	afterEach(() => fetchMock.assertNoPendingInterceptors());

	describe("GET /_/admin/api/me", () => {
		it("should reject a request without a Cloudflare Access token", async () => {
			const response = await httpTestClient._.admin.api.me.$get();

			expect(response.status).toBe(401);
			expect(await response.json()).to.deep.equal({ error: "Missing Cloudflare Access token", statusCode: 401 });
		});

		it("should not accept a registry token in place of a Cloudflare Access token", async () => {
			const response = await httpTestClient._.admin.api.me.$get(
				{},
				{ headers: { Authorization: `Bearer ${env.ADMIN_TOKEN}` } }
			);

			expect(response.status).toBe(401);
		});

		it("should reject a token that is not a JWT", async () => {
			const response = await httpTestClient._.admin.api.me.$get(
				{},
				{ headers: { "Cf-Access-Jwt-Assertion": "not-a-jwt" } }
			);

			expect(response.status).toBe(401);
			expect(await response.json()).to.deep.equal({ error: "Invalid Cloudflare Access token", statusCode: 401 });
		});

		it("should reject a token signed by an unknown key", async () => {
			mockAccessCerts(signingKey);
			const unknownKey = await createSigningKey();

			const response = await httpTestClient._.admin.api.me.$get(
				{},
				{ headers: { "Cf-Access-Jwt-Assertion": await createAccessToken({}, unknownKey) } }
			);

			expect(response.status).toBe(401);
		});

		it("should reject a token whose signature does not match the published key", async () => {
			mockAccessCerts(signingKey);
			const forgedKey = await createSigningKey(signingKey.kid);

			const response = await httpTestClient._.admin.api.me.$get(
				{},
				{ headers: { "Cf-Access-Jwt-Assertion": await createAccessToken({}, forgedKey) } }
			);

			expect(response.status).toBe(401);
		});

		it("should reject a token issued for another Access application", async () => {
			mockAccessCerts(signingKey);

			const response = await httpTestClient._.admin.api.me.$get(
				{},
				{ headers: { "Cf-Access-Jwt-Assertion": await createAccessToken({ aud: ["another-application"] }) } }
			);

			expect(response.status).toBe(401);
		});

		it("should reject a token issued by another team", async () => {
			mockAccessCerts(signingKey);

			const response = await httpTestClient._.admin.api.me.$get(
				{},
				{
					headers: {
						"Cf-Access-Jwt-Assertion": await createAccessToken({ iss: "https://another-team.cloudflareaccess.com" })
					}
				}
			);

			expect(response.status).toBe(401);
		});

		it("should reject an expired token", async () => {
			mockAccessCerts(signingKey);
			const now = Math.floor(Date.now() / 1000);

			const response = await httpTestClient._.admin.api.me.$get(
				{},
				{ headers: { "Cf-Access-Jwt-Assertion": await createAccessToken({ iat: now - 600, exp: now - 300 }) } }
			);

			expect(response.status).toBe(401);
		});

		it("should reject a token signed with a symmetric algorithm", async () => {
			const token = await sign(
				{ aud: [env.CF_ACCESS_AUD], iss: issuer, sub: "user", kid: signingKey.kid },
				"secret",
				"HS256"
			);

			const response = await httpTestClient._.admin.api.me.$get({}, { headers: { "Cf-Access-Jwt-Assertion": token } });

			expect(response.status).toBe(401);
		});

		it("should reject a token identifying nobody", async () => {
			mockAccessCerts(signingKey);

			const response = await httpTestClient._.admin.api.me.$get(
				{},
				{ headers: { "Cf-Access-Jwt-Assertion": await createAccessToken({ sub: "", email: undefined }) } }
			);

			expect(response.status).toBe(401);
		});

		it("should identify the administrator from the Cloudflare Access header", async () => {
			mockAccessCerts(signingKey);

			const response = await httpTestClient._.admin.api.me.$get(
				{},
				{ headers: { "Cf-Access-Jwt-Assertion": await createAccessToken() } }
			);

			expect(response.status).toBe(200);
			expect(await response.json()).to.deep.equal({
				provider: "cloudflare-access",
				subject: "7335d417-61da-459d-899c-0a01c76a2f94",
				email: "admin@example.com"
			});
		});

		it("should identify the administrator from the Cloudflare Access cookie", async () => {
			mockAccessCerts(signingKey);

			const response = await httpTestClient._.admin.api.me.$get(
				{},
				{ headers: { Cookie: `CF_Authorization=${await createAccessToken()}` } }
			);

			expect(response.status).toBe(200);
			expect(await response.json()).to.have.property("email", "admin@example.com");
		});

		it("should identify a service token by its client id", async () => {
			mockAccessCerts(signingKey);

			const response = await httpTestClient._.admin.api.me.$get(
				{},
				{
					headers: {
						"Cf-Access-Jwt-Assertion": await createAccessToken({
							sub: "",
							email: undefined,
							common_name: "service-token.access"
						})
					}
				}
			);

			expect(response.status).toBe(200);
			expect(await response.json()).to.deep.equal({ provider: "cloudflare-access", subject: "service-token.access" });
		});

		it("should accept a token from a rotated key as long as it is still published", async () => {
			const rotatedKey = await createSigningKey();
			mockAccessCerts(rotatedKey, signingKey);

			const response = await httpTestClient._.admin.api.me.$get(
				{},
				{ headers: { "Cf-Access-Jwt-Assertion": await createAccessToken({}, signingKey) } }
			);

			expect(response.status).toBe(200);
		});
	});

	describe("admin area", () => {
		it("should protect every path under /_/admin", async () => {
			for (const path of ["/_/admin", "/_/admin/", "/_/admin/anything", "/_/admin/api/unknown"]) {
				const response = await app.request(path, undefined, env, createExecutionContext());

				expect(response.status, path).toBe(401);
			}
		});

		it("should answer deep links with the app shell once authenticated", async () => {
			const headers = await createAdminHeaders();

			const response = await app.request("/_/admin/packages/mock", { headers }, env, createExecutionContext());

			// The shell only exists once apps/admin has been built, which the test suite does not require.
			expect([200, 404]).toContain(response.status);
			if (response.status === 404) {
				expect(await response.json()).to.deep.equal({ error: "The admin UI has not been built", statusCode: 404 });
			} else {
				expect(response.headers.get("content-type")).toContain("text/html");
			}
		});

		it("should not answer unknown admin API routes with the app shell", async () => {
			const response = await app.request(
				"/_/admin/api/unknown",
				{ headers: await createAdminHeaders() },
				env,
				createExecutionContext()
			);

			expect(response.status).toBe(404);
			expect(await response.json()).to.deep.equal({ error: "Not found", statusCode: 404 });
		});

		it("should leave a package named admin to the registry", async () => {
			fetchMock.get(env.FALLBACK_REGISTRY_ENDPOINT).intercept({ path: "/admin" }).reply(200, { name: "admin" });

			const response = await app.request("/admin", undefined, env, createExecutionContext());

			expect(response.status).toBe(200);
			expect(await response.json()).to.have.property("name", "admin");
		});

		it("should close the admin area when authentication is not configured", async () => {
			// Access values are not part of wrangler.toml (they are deployment-specific), only of the test bindings.
			const mutableEnv = workerEnv as unknown as { CF_ACCESS_AUD: string };
			const aud = mutableEnv.CF_ACCESS_AUD;
			mutableEnv.CF_ACCESS_AUD = "";

			try {
				const response = await httpTestClient._.admin.api.me.$get(
					{},
					{ headers: { "Cf-Access-Jwt-Assertion": await createAccessToken() } }
				);

				expect(response.status).toBe(503);
				expect(await response.json()).to.deep.equal({
					error: "Admin authentication is not configured",
					statusCode: 503
				});
			} finally {
				mutableEnv.CF_ACCESS_AUD = aud;
			}
		});

		it("should trust local requests only with the local provider", async () => {
			// The generated types pin the variable to its wrangler.toml value; it is a plain string at runtime.
			const mutableEnv = workerEnv as { ADMIN_AUTH_PROVIDER: string };
			const provider = mutableEnv.ADMIN_AUTH_PROVIDER;
			mutableEnv.ADMIN_AUTH_PROVIDER = "local";

			try {
				const local = await app.request(
					"http://localhost:8787/_/admin/api/me",
					undefined,
					env,
					createExecutionContext()
				);
				expect(local.status).toBe(200);
				expect(await local.json()).to.deep.equal({ provider: "local", subject: "local-developer" });

				const remote = await app.request(
					"https://registry.example.com/_/admin/api/me",
					undefined,
					env,
					createExecutionContext()
				);
				expect(remote.status).toBe(401);
			} finally {
				mutableEnv.ADMIN_AUTH_PROVIDER = provider;
			}
		});

		it("should not require Cloudflare Access on registry routes", async () => {
			const response = await httpTestClient["-"].npm.v1.tokens.$get(
				{},
				{ headers: { Authorization: `Bearer ${env.ADMIN_TOKEN}` } }
			);

			expect(response.status).toBe(200);
		});
	});
});
