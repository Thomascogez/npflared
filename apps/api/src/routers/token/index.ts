import { describeRoute, resolver } from "hono-openapi";
import { standardOpenApiErrorResponses } from "#openapi";
import { tokenService } from "#services/token-service";
import { assertTokenAccess } from "#utils/access";
import { $ } from "#utils/factory";
import { HttpError } from "#utils/http";
import { zValidator } from "#utils/validation";
import { validators } from "./validators";

export const tokenRouter = $.createApp()
	.post(
		"/-/npm/v1/tokens",
		describeRoute({
			description: "Create a new token with specific scopes. The plaintext token is only returned in this response.",
			responses: {
				...standardOpenApiErrorResponses,
				201: {
					description: "Token created",
					content: {
						"application/json": {
							schema: resolver(validators.post.response[201])
						}
					}
				}
			}
		}),
		zValidator("json", validators.post.request.json),
		async (c) => {
			const can = assertTokenAccess(c.get("token"));

			const body = c.req.valid("json");

			if (!can("write", "token", "*")) {
				throw HttpError.forbidden();
			}

			const token = await tokenService.createToken(body);
			if (!token) {
				throw HttpError.internalServerError();
			}

			return c.json(token, 201);
		}
	)
	.get(
		"/-/npm/v1/tokens",
		describeRoute({
			description: "List all tokens (without their secrets)",
			responses: {
				...standardOpenApiErrorResponses,
				200: {
					description: "List of tokens",
					content: {
						"application/json": {
							schema: resolver(validators.list.response[200])
						}
					}
				}
			}
		}),
		async (c) => {
			const can = assertTokenAccess(c.get("token"));

			if (!can("read", "token", "*")) {
				throw HttpError.forbidden();
			}

			const tokens = await tokenService.listTokens();

			return c.json(tokens);
		}
	)
	.get(
		"/-/npm/v1/tokens/token/:id",
		describeRoute({
			description: "Get a token by id",
			responses: {
				...standardOpenApiErrorResponses,
				200: {
					description: "Token",
					content: {
						"application/json": {
							schema: resolver(validators.get.response[200])
						}
					}
				}
			}
		}),
		zValidator("param", validators.get.request.param),
		async (c) => {
			const can = assertTokenAccess(c.get("token"));

			const { id } = c.req.valid("param");

			if (!can("read", "token", id)) {
				throw HttpError.forbidden();
			}

			const targetedToken = await tokenService.getToken(id);

			if (!targetedToken) {
				throw HttpError.notFound();
			}

			return c.json(targetedToken);
		}
	)
	.delete(
		"/-/npm/v1/tokens/token/:id",
		describeRoute({
			description: "Revoke a token by id",
			responses: {
				...standardOpenApiErrorResponses,
				200: {
					description: "Token deleted",
					content: {
						"application/json": {
							schema: resolver(validators.delete.response[200])
						}
					}
				}
			}
		}),
		zValidator("param", validators.delete.request.param),
		async (c) => {
			const can = assertTokenAccess(c.get("token"));

			const { id } = c.req.valid("param");

			if (!can("write", "token", id)) {
				throw HttpError.forbidden();
			}

			const deleted = await tokenService.deleteToken(id);

			if (!deleted) {
				throw HttpError.notFound();
			}

			return c.json({ message: "ok" });
		}
	);
