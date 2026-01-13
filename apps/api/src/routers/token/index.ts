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
			description: "Create a new token with specific scopes",
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
			description: "List all tokens",
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
		"/-/npm/v1/tokens/token/:token",
		describeRoute({
			description: "Get a token",
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

			const { token } = c.req.valid("param");

			if (!can("read", "token", token)) {
				throw HttpError.forbidden();
			}

			const targetedToken = await tokenService.getToken(token);

			if (!targetedToken) {
				throw HttpError.notFound();
			}

			return c.json(targetedToken);
		}
	)
	.delete(
		"/-/npm/v1/tokens/token/:token",
		describeRoute({
			description: "Delete a token",
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

			const { token } = c.req.valid("param");

			if (!can("write", "token", token)) {
				throw HttpError.forbidden();
			}

			await tokenService.deleteToken(token);

			return c.json({ message: "ok" });
		}
	);
