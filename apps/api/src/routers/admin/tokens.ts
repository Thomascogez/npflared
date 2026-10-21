import { describeRoute, resolver } from "hono-openapi";
import { adminOpenApiErrorResponses } from "#openapi";
import { tokenService } from "#services/token-service";
import { $ } from "#utils/factory";
import { HttpError } from "#utils/http";
import { zValidator } from "#utils/validation";
import { validators } from "./validators";

/** Token management for the admin area: administrators are not subject to token scopes. */
export const adminTokenRouter = $.createApp()
	.get(
		"/_/admin/api/tokens",
		describeRoute({
			description: "List all tokens (without their secrets)",
			responses: {
				...adminOpenApiErrorResponses,
				200: {
					description: "List of tokens",
					content: {
						"application/json": {
							schema: resolver(validators.tokens.list.response[200])
						}
					}
				}
			}
		}),
		async (c) => {
			const tokens = await tokenService.listTokens();

			return c.json(tokens);
		}
	)
	.post(
		"/_/admin/api/tokens",
		describeRoute({
			description: "Create a new token with specific scopes. The plaintext token is only returned in this response.",
			responses: {
				...adminOpenApiErrorResponses,
				201: {
					description: "Token created",
					content: {
						"application/json": {
							schema: resolver(validators.tokens.post.response[201])
						}
					}
				}
			}
		}),
		zValidator("json", validators.tokens.post.request.json),
		async (c) => {
			const token = await tokenService.createToken(c.req.valid("json"));

			if (!token) {
				throw HttpError.internalServerError();
			}

			return c.json(token, 201);
		}
	)
	.get(
		"/_/admin/api/tokens/:id",
		describeRoute({
			description: "Get a token by id",
			responses: {
				...adminOpenApiErrorResponses,
				200: {
					description: "Token",
					content: {
						"application/json": {
							schema: resolver(validators.tokens.get.response[200])
						}
					}
				}
			}
		}),
		zValidator("param", validators.tokens.get.request.param),
		async (c) => {
			const { id } = c.req.valid("param");

			const token = await tokenService.getToken(id);

			if (!token) {
				throw HttpError.notFound();
			}

			return c.json(token);
		}
	)
	.delete(
		"/_/admin/api/tokens/:id",
		describeRoute({
			description: "Revoke a token by id",
			responses: {
				...adminOpenApiErrorResponses,
				200: {
					description: "Token revoked",
					content: {
						"application/json": {
							schema: resolver(validators.tokens.delete.response[200])
						}
					}
				}
			}
		}),
		zValidator("param", validators.tokens.delete.request.param),
		async (c) => {
			const { id } = c.req.valid("param");

			const deleted = await tokenService.deleteToken(id);

			if (!deleted) {
				throw HttpError.notFound();
			}

			return c.json({ message: "ok" });
		}
	);
