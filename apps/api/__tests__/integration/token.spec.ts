import { env } from "cloudflare:test";
import type { InferRequestType } from "hono";
import { describe, expect, it } from "vitest";
import type { PublicToken } from "../../src/services/token-service";
import { hashToken, TOKEN_PREFIX } from "../../src/utils/token";
import { createToken, httpTestClient } from "../utils";

const adminHeaders = { Authorization: `Bearer ${env.ADMIN_TOKEN}` };

const getStoredTokenRow = (id: string) =>
	env.DB.prepare("SELECT * FROM token WHERE id = ?")
		.bind(id)
		.first<{ id: string; token_hash: string | null; legacy_token: string | null; name: string }>();

describe("token routes", () => {
	describe("POST /tokens", () => {
		it("should not create a token without being authenticated", async () => {
			const response = await httpTestClient["-"].npm.v1.tokens.$post(
				{
					json: {
						name: "test-token",
						scopes: [{ type: "package:read", values: ["*"] }]
					}
				},
				{
					headers: {
						"Content-Type": "application/json"
					}
				}
			);

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not create a token with an invalid token", async () => {
			const response = await httpTestClient["-"].npm.v1.tokens.$post(
				{
					json: {
						name: "test-token",
						scopes: [{ type: "package:read", values: ["*"] }]
					}
				},
				{
					headers: {
						"Content-Type": "application/json",
						Authorization: "Bearer invalid_token"
					}
				}
			);

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not create a token with a token that does not have the token write scope", async () => {
			const { token } = await createToken();

			const response = await httpTestClient["-"].npm.v1.tokens.$post(
				{
					json: {
						name: "test-token",
						scopes: [{ type: "package:read", values: ["*"] }]
					}
				},
				{
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`
					}
				}
			);

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not create a token without providing at least one scope", async () => {
			const response = await httpTestClient["-"].npm.v1.tokens.$post(
				{
					json: {
						name: "test-token",
						scopes: []
					}
				},
				{
					headers: {
						"Content-Type": "application/json",
						...adminHeaders
					}
				}
			);

			expect(response.status).toBe(400);
			expect(response.statusText).toBe("Bad Request");
		});

		it("should not create a token when providing an invalid scope", async () => {
			const response = await httpTestClient["-"].npm.v1.tokens.$post(
				{
					json: {
						name: "test-token",
						scopes: [
							{
								type: "invalid_scope" as never,
								values: ["*"]
							}
						]
					}
				},
				{
					headers: {
						"Content-Type": "application/json",
						...adminHeaders
					}
				}
			);

			expect(response.status).toBe(400);
			expect(response.statusText).toBe("Bad Request");
		});

		it("should create a token and return its plaintext value", async () => {
			const body = {
				name: "test-token",
				scopes: [
					{
						type: "package:read+write",
						values: ["*"]
					}
				]
			} satisfies InferRequestType<(typeof httpTestClient)["-"]["npm"]["v1"]["tokens"]["$post"]>["json"];

			const response = await httpTestClient["-"].npm.v1.tokens.$post(
				{
					json: body
				},
				{
					headers: {
						"Content-Type": "application/json",
						...adminHeaders
					}
				}
			);

			expect(response.status).toBe(201);

			const responseBody = await response.json();

			expect(responseBody).to.have.property("id").to.be.a("string").that.is.not.empty;
			expect(responseBody).to.have.property("name", body.name);
			expect(responseBody).to.have.property("token").to.be.a("string");
			expect(responseBody.token.startsWith(TOKEN_PREFIX)).toBe(true);
			expect(responseBody).to.have.property("scopes").to.be.an("array").to.deep.equal(body.scopes);
			expect(responseBody).to.have.property("createdAt").to.be.a("number");
			expect(responseBody).to.have.property("updatedAt").to.be.a("number");
			expect(responseBody).not.to.have.property("tokenHash");
			expect(responseBody).not.to.have.property("legacyToken");
		});

		it("should only store the hash of the created token", async () => {
			const { id, token } = await createToken();

			const row = await getStoredTokenRow(id);

			expect(row).not.toBeNull();
			expect(row?.token_hash).toBe(await hashToken(token));
			expect(row?.legacy_token).toBeNull();
			expect(JSON.stringify(row)).not.toContain(token);
		});

		it("should generate distinct tokens for each creation", async () => {
			const first = await createToken();
			const second = await createToken();

			expect(first.id).not.toBe(second.id);
			expect(first.token).not.toBe(second.token);
		});
	});

	describe("GET /tokens", () => {
		it("should not get tokens without been authenticated", async () => {
			const response = await httpTestClient["-"].npm.v1.tokens.$get();

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not get tokens with an invalid token", async () => {
			const response = await httpTestClient["-"].npm.v1.tokens.$get(
				{},
				{
					headers: {
						Authorization: "Bearer invalid_token"
					}
				}
			);

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not get tokens with a token that does not have the token read scope", async () => {
			const { token } = await createToken();

			const response = await httpTestClient["-"].npm.v1.tokens.$get(
				{},
				{
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should get tokens without exposing any secret", async () => {
			const { id, token, name, scopes, createdAt, updatedAt } = await createToken();
			const response = await httpTestClient["-"].npm.v1.tokens.$get(
				{},
				{
					headers: adminHeaders
				}
			);

			expect(response.status).toBe(200);

			const responseBody = (await response.json()) as PublicToken[];
			expect(responseBody).to.be.an("array").with.length.greaterThanOrEqual(2);

			const adminToken = responseBody.find((tokenDetails) => tokenDetails.id === env.ADMIN_TOKEN_ID);
			expect(adminToken).to.be.an("object");
			expect(adminToken).to.have.property("name", "admin-token");
			expect(adminToken)
				.to.have.property("scopes")
				.to.be.deep.equal([
					{ type: "token:read+write", values: ["*"] },
					{ type: "user:read+write", values: ["*"] },
					{ type: "package:read+write", values: ["*"] }
				]);

			const createdToken = responseBody.find((tokenDetails) => tokenDetails.id === id);
			expect(createdToken).to.be.an("object");
			expect(createdToken).to.have.property("name", name);
			expect(createdToken).to.have.property("scopes").to.be.deep.equal(scopes);
			expect(createdToken).to.have.property("createdAt", createdAt);
			expect(createdToken).to.have.property("updatedAt", updatedAt);

			const serialized = JSON.stringify(responseBody);
			expect(serialized).not.toContain(token);
			expect(serialized).not.toContain(env.ADMIN_TOKEN);
			expect(serialized).not.toContain(await hashToken(token));
			expect(serialized).not.toContain(await hashToken(env.ADMIN_TOKEN));
			for (const tokenDetails of responseBody) {
				expect(tokenDetails).not.to.have.property("token");
				expect(tokenDetails).not.to.have.property("tokenHash");
				expect(tokenDetails).not.to.have.property("legacyToken");
			}
		});
	});

	describe("GET /tokens/token/:id", () => {
		it("should not get a token without being authenticated", async () => {
			const response = await httpTestClient["-"].npm.v1.tokens.token[":id"].$get({
				param: { id: "test-token" }
			});

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not get a token with an invalid token", async () => {
			const response = await httpTestClient["-"].npm.v1.tokens.token[":id"].$get(
				{
					param: { id: "test-token" }
				},
				{
					headers: {
						Authorization: "Bearer invalid_token"
					}
				}
			);

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not get a token with a token that does not have the token read scope", async () => {
			const { id, token } = await createToken();

			const response = await httpTestClient["-"].npm.v1.tokens.token[":id"].$get(
				{
					param: { id }
				},
				{
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not find a token by its plaintext value", async () => {
			const { token } = await createToken();

			const response = await httpTestClient["-"].npm.v1.tokens.token[":id"].$get(
				{
					param: { id: token }
				},
				{
					headers: adminHeaders
				}
			);

			expect(response.status).toBe(404);
			expect(response.statusText).toBe("Not Found");
		});

		it("should get a token by id without exposing any secret", async () => {
			const { id, token, name, scopes, createdAt, updatedAt } = await createToken();

			const response = await httpTestClient["-"].npm.v1.tokens.token[":id"].$get(
				{
					param: { id }
				},
				{
					headers: adminHeaders
				}
			);

			expect(response.status).toBe(200);

			const responseBody = (await response.json()) as PublicToken;

			expect(responseBody).to.be.an("object");
			expect(responseBody).to.have.property("id", id);
			expect(responseBody).to.have.property("name", name);
			expect(responseBody).to.have.property("scopes").to.be.deep.equal(scopes);
			expect(responseBody).to.have.property("createdAt", createdAt);
			expect(responseBody).to.have.property("updatedAt", updatedAt);
			expect(responseBody).not.to.have.property("token");
			expect(responseBody).not.to.have.property("tokenHash");
			expect(responseBody).not.to.have.property("legacyToken");
			expect(JSON.stringify(responseBody)).not.toContain(token);
		});
	});

	describe("DELETE /tokens/token/:id", () => {
		it("should not delete a token without being authenticated", async () => {
			const response = await httpTestClient["-"].npm.v1.tokens.token[":id"].$delete({
				param: { id: "test-token" }
			});

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not delete a token with an invalid token", async () => {
			const response = await httpTestClient["-"].npm.v1.tokens.token[":id"].$delete(
				{
					param: { id: "test-token" }
				},
				{
					headers: {
						Authorization: "Bearer invalid_token"
					}
				}
			);

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not delete a token with a token that does not have the token write scope", async () => {
			const { id, token } = await createToken();

			const response = await httpTestClient["-"].npm.v1.tokens.token[":id"].$delete(
				{
					param: { id }
				},
				{
					headers: {
						Authorization: `Bearer ${token}`
					}
				}
			);

			expect(response.status).toBe(403);
			expect(response.statusText).toBe("Forbidden");
		});

		it("should not delete a token by its plaintext value", async () => {
			const { id, token } = await createToken();

			const response = await httpTestClient["-"].npm.v1.tokens.token[":id"].$delete(
				{
					param: { id: token }
				},
				{
					headers: adminHeaders
				}
			);

			expect(response.status).toBe(404);
			expect(response.statusText).toBe("Not Found");
			expect(await getStoredTokenRow(id)).not.toBeNull();
		});

		it("should delete a token by id and reject it afterwards", async () => {
			const { id, token } = await createToken({
				name: "to-revoke",
				scopes: [{ type: "token:read", values: ["*"] }]
			});

			const beforeRevocation = await httpTestClient["-"].npm.v1.tokens.$get(
				{},
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			expect(beforeRevocation.status).toBe(200);

			const response = await httpTestClient["-"].npm.v1.tokens.token[":id"].$delete(
				{
					param: { id }
				},
				{
					headers: adminHeaders
				}
			);

			expect(response.status).toBe(200);

			const responseBody = await response.json();
			expect(responseBody).to.have.property("message").to.be.a("string").to.equal("ok");
			expect(await getStoredTokenRow(id)).toBeNull();

			const afterRevocation = await httpTestClient["-"].npm.v1.tokens.$get(
				{},
				{ headers: { Authorization: `Bearer ${token}` } }
			);
			expect(afterRevocation.status).toBe(403);
		});
	});

	describe("legacy plaintext tokens", () => {
		it("should authenticate a legacy token and upgrade it to a hash on first use", async () => {
			const before = await getStoredTokenRow(env.LEGACY_TOKEN_ID);
			expect(before?.legacy_token).toBe(env.LEGACY_TOKEN);
			expect(before?.token_hash).toBeNull();

			const response = await httpTestClient["-"].npm.v1.tokens.$get(
				{},
				{ headers: { Authorization: `Bearer ${env.LEGACY_TOKEN}` } }
			);
			expect(response.status).toBe(200);

			const after = await getStoredTokenRow(env.LEGACY_TOKEN_ID);
			expect(after?.legacy_token).toBeNull();
			expect(after?.token_hash).toBe(await hashToken(env.LEGACY_TOKEN));

			const subsequentResponse = await httpTestClient["-"].npm.v1.tokens.$get(
				{},
				{ headers: { Authorization: `Bearer ${env.LEGACY_TOKEN}` } }
			);
			expect(subsequentResponse.status).toBe(200);
		});

		it("should list a legacy token without exposing its plaintext", async () => {
			const response = await httpTestClient["-"].npm.v1.tokens.$get({}, { headers: adminHeaders });
			expect(response.status).toBe(200);

			const responseBody = (await response.json()) as PublicToken[];
			const legacyToken = responseBody.find((tokenDetails) => tokenDetails.id === env.LEGACY_TOKEN_ID);

			expect(legacyToken).to.have.property("name", "legacy-token");
			expect(JSON.stringify(responseBody)).not.toContain(env.LEGACY_TOKEN);
		});
	});
});
