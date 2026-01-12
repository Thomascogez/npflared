import { db } from "#db/index";
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

	const targetedToken = await db.query.tokenTable.findFirst({
		where: (table, { eq }) => eq(table.token, token)
	});

	if (targetedToken) {
		c.set("token", targetedToken);
	}

	await next();
});
