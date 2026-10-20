import { tokenService } from "#services/token-service";
import { $ } from "#utils/factory";

export const loadToken = $.createMiddleware(async (c, next) => {
	const authorizationHeader = c.req.header("Authorization");

	if (!authorizationHeader) {
		return await next();
	}

	const [, token] = authorizationHeader.split(" ");

	if (!token) {
		return await next();
	}

	const authenticatedToken = await tokenService.authenticate(token);

	if (authenticatedToken) {
		c.set("token", authenticatedToken);
	}

	await next();
});
