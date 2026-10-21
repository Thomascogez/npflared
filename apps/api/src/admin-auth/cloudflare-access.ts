import { getCookie } from "hono/cookie";
import { verifyWithJwks } from "hono/jwt";
import type { JWTPayload } from "hono/utils/jwt/types";
import { HttpError } from "#utils/http";
import type { AdminAuthProvider, AdminIdentity } from "./provider";

/** Header set by Cloudflare Access on requests it has authenticated. */
const ACCESS_JWT_HEADER = "Cf-Access-Jwt-Assertion";
/** Cookie set by Cloudflare Access in the browser, used when the header is absent. */
const ACCESS_JWT_COOKIE = "CF_Authorization";
/** Cloudflare Access signs its JWTs with RS256 and rotates its keys. */
const ACCESS_JWT_ALGORITHMS = ["RS256"] as const;
/** How long (in seconds) the Cloudflare edge may cache the signing keys between requests. */
const ACCESS_CERTS_CACHE_TTL = 3600;

export const CLOUDFLARE_ACCESS_PROVIDER = "cloudflare-access";

export type CloudflareAccessConfig = {
	/** Team domain of the Cloudflare Zero Trust organisation, eg. `my-team.cloudflareaccess.com`. */
	teamDomain: string;
	/** Application Audience (AUD) tag of the Access application protecting `/_/admin`. */
	aud: string;
};

type AccessJwtPayload = JWTPayload & {
	sub?: string;
	email?: string;
	/** Client id of the service token used to authenticate, when no user is involved. */
	common_name?: string;
};

/** Accepts the team domain with or without a scheme or trailing slash. */
const normalizeTeamDomain = (teamDomain: string) =>
	teamDomain
		.trim()
		.replace(/^https?:\/\//, "")
		.replace(/\/+$/, "");

const isJwtError = (error: unknown): error is Error => error instanceof Error && error.name.startsWith("Jwt");

/**
 * Validates the JWT Cloudflare Access attaches to requests it let through.
 * The signature, issuer, audience and expiry are all checked server-side, so a request
 * reaching the worker without going through Access (or for another application) is rejected.
 */
export const createCloudflareAccessProvider = ({ teamDomain, aud }: CloudflareAccessConfig): AdminAuthProvider => {
	const issuer = `https://${normalizeTeamDomain(teamDomain)}`;
	const certsUrl = `${issuer}/cdn-cgi/access/certs`;

	return {
		name: CLOUDFLARE_ACCESS_PROVIDER,
		async authenticate(c) {
			const token = c.req.header(ACCESS_JWT_HEADER) ?? getCookie(c, ACCESS_JWT_COOKIE);

			if (!token) {
				throw HttpError.unauthorized("Missing Cloudflare Access token");
			}

			let payload: AccessJwtPayload;

			try {
				payload = (await verifyWithJwks(
					token,
					{
						jwks_uri: certsUrl,
						allowedAlgorithms: ACCESS_JWT_ALGORITHMS,
						verification: { iss: issuer, aud }
					},
					{ cf: { cacheTtl: ACCESS_CERTS_CACHE_TTL, cacheEverything: true } }
				)) as AccessJwtPayload;
			} catch (error) {
				if (isJwtError(error)) {
					throw HttpError.unauthorized("Invalid Cloudflare Access token");
				}

				throw error;
			}

			const subject = payload.sub || payload.common_name;

			if (!subject) {
				throw HttpError.unauthorized("Invalid Cloudflare Access token");
			}

			const identity: AdminIdentity = { provider: CLOUDFLARE_ACCESS_PROVIDER, subject };

			if (payload.email) {
				identity.email = payload.email;
			}

			return identity;
		}
	};
};
