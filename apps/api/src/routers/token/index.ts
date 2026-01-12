import { tokenService } from "#services/token-service";
import { assertTokenAccess } from "#utils/access";
import { $ } from "#utils/factory";
import { HttpError } from "#utils/http";
import { zValidator } from "#utils/validation";
import { deleteTokenValidators, getTokenValidators, postTokenValidators } from "./validators";

export const tokenRouter = $.createApp()
	.post("/-/npm/v1/tokens", zValidator("json", postTokenValidators.json), async (c) => {
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
	})
	.get("/-/npm/v1/tokens", async (c) => {
		const can = assertTokenAccess(c.get("token"));

		if (!can("read", "token", "*")) {
			throw HttpError.forbidden();
		}

		const tokens = await tokenService.listTokens();

		return c.json(tokens);
	})
	.get("/-/npm/v1/tokens/token/:token", zValidator("param", getTokenValidators.param), async (c) => {
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
	})
	.delete("/-/npm/v1/tokens/token/:token", zValidator("param", deleteTokenValidators.param), async (c) => {
		const can = assertTokenAccess(c.get("token"));

		const { token } = c.req.valid("param");

		if (!can("write", "token", token)) {
			throw HttpError.forbidden();
		}

		await tokenService.deleteToken(token);

		return c.json({ message: "ok" });
	});
