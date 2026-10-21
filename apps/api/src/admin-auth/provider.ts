import type { Context } from "hono";

/** Whoever has been authenticated as an administrator, as reported by the provider that checked them. */
export type AdminIdentity = {
	/** Name of the provider that authenticated the request, eg. `cloudflare-access`. */
	provider: string;
	/** Stable identifier of the administrator within the provider. */
	subject: string;
	/** Email address of the administrator, when the provider knows it. */
	email?: string;
};

/**
 * Authenticates administrative requests.
 * Implementations resolve the identity behind a request or throw an `HttpError`,
 * which keeps the admin routes independent from how administrators sign in.
 */
export interface AdminAuthProvider {
	name: string;
	authenticate(c: Context<AppEnv>): Promise<AdminIdentity>;
}
