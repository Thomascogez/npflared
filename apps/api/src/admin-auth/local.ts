import { HttpError } from "#utils/http";
import type { AdminAuthProvider } from "./provider";

export const LOCAL_PROVIDER = "local";

/** Hostnames a request only carries when it is addressed to the developer's own machine. */
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "firestash.localhost"]);

/**
 * Development-only provider for `pnpm dev`: trusts any request addressed to the local machine.
 * A deployed worker never receives requests for a local hostname, so enabling it by mistake
 * in production locks the admin area instead of opening it.
 */
export const createLocalProvider = (): AdminAuthProvider => ({
	name: LOCAL_PROVIDER,
	async authenticate(c) {
		const { hostname } = new URL(c.req.url);

		if (!LOCAL_HOSTNAMES.has(hostname)) {
			throw HttpError.unauthorized("The local admin authentication provider only accepts local requests");
		}

		return { provider: LOCAL_PROVIDER, subject: "local-developer" };
	}
});
