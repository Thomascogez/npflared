import { env } from "cloudflare:workers";
import { resolveAdminAuthProvider } from "#admin-auth/index";
import { $ } from "#utils/factory";
import { HttpError } from "#utils/http";

/**
 * Guards administrative routes: the request must carry a valid identity from the configured
 * admin authentication provider, which is then available through `c.get("admin")`.
 * Registry tokens are deliberately ignored here: npm clients never reach the admin area.
 */
export const adminAuth = $.createMiddleware(async (c, next) => {
	const provider = resolveAdminAuthProvider(env);

	if (!provider) {
		throw HttpError.serviceUnavailable("Admin authentication is not configured");
	}

	c.set("admin", await provider.authenticate(c));

	await next();
});
