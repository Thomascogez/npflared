import { CLOUDFLARE_ACCESS_PROVIDER, createCloudflareAccessProvider } from "./cloudflare-access";
import { createLocalProvider, LOCAL_PROVIDER } from "./local";
import type { AdminAuthProvider } from "./provider";

/** Environment variables driving admin authentication. All of them are deployment-specific. */
export type AdminAuthConfig = {
	/** Which provider authenticates administrators: `cloudflare-access` (default) or `local` (development only). */
	ADMIN_AUTH_PROVIDER?: string;
	CF_ACCESS_TEAM_DOMAIN?: string;
	CF_ACCESS_AUD?: string;
};

const providers: Record<string, (config: AdminAuthConfig) => AdminAuthProvider | undefined> = {
	[CLOUDFLARE_ACCESS_PROVIDER]: ({ CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD }) => {
		if (!CF_ACCESS_TEAM_DOMAIN || !CF_ACCESS_AUD) {
			return undefined;
		}

		return createCloudflareAccessProvider({ teamDomain: CF_ACCESS_TEAM_DOMAIN, aud: CF_ACCESS_AUD });
	},
	[LOCAL_PROVIDER]: () => createLocalProvider()
};

/**
 * Picks the configured admin authentication provider.
 * Returns `undefined` when the provider is unknown or not fully configured,
 * in which case the admin area stays closed.
 */
export const resolveAdminAuthProvider = (config: AdminAuthConfig): AdminAuthProvider | undefined => {
	const providerName = config.ADMIN_AUTH_PROVIDER || CLOUDFLARE_ACCESS_PROVIDER;

	return providers[providerName]?.(config);
};
