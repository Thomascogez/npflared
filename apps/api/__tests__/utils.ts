import { createExecutionContext, env, fetchMock } from "cloudflare:test";
import type { InferRequestType } from "hono/client";
import { sign } from "hono/jwt";
import { testClient } from "hono/testing";
import app, { type Routes } from "#index";
import packagePublishPayload from "./mocks/package-publish-payload.json";

const executionCtx = createExecutionContext();
export const httpTestClient = testClient<Routes>(app, env, executionCtx);

export const createToken = async (
	body: InferRequestType<(typeof httpTestClient)["-"]["npm"]["v1"]["tokens"]["$post"]>["json"] = {
		name: crypto.randomUUID(),
		scopes: [{ type: "package:read+write", values: ["*"] }]
	}
) => {
	const response = await httpTestClient["-"].npm.v1.tokens.$post(
		{
			json: body
		},
		{
			headers: {
				Authorization: `Bearer ${env.ADMIN_TOKEN}`,
				"Content-Type": "application/json"
			}
		}
	);

	if (!response.ok) {
		throw new Error(`Failed to put token: ${response.statusText}`);
	}
	const responseBody = await response.json();

	return responseBody;
};

export const publishMockPackage = async (body = packagePublishPayload) => {
	const { token } = await createToken({
		name: "test-token",
		scopes: [{ type: "package:write", values: ["mock"] }]
	});

	const response = await httpTestClient[":packageName"].$put(
		{
			json: body,
			param: { packageName: "mock" }
		},
		{
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`
			}
		}
	);

	if (!response.ok) {
		throw new Error(`Failed to publish package: ${response.statusText}`);
	}

	return response;
};

type PublishPayload = InferRequestType<(typeof httpTestClient)[":packageName"]["$put"]>["json"];

export const tarballUrlOf = (name: string, version: string) => `http://localhost:8787/${name}/-/${name}-${version}.tgz`;

/** Builds the payload `npm publish` sends for a package, reusing the mock tarball. */
export const createPublishPayload = (
	name: string,
	version = "1.0.0",
	distTags: Record<string, string> = { latest: version },
	manifest: Record<string, unknown> = {}
): PublishPayload => {
	const baseVersion = packagePublishPayload.versions["1.0.0"];
	const tarballName = `${name}-${version}.tgz`;

	return {
		_id: name,
		name,
		"dist-tags": distTags,
		versions: {
			[version]: {
				...baseVersion,
				...manifest,
				_id: `${name}@${version}`,
				name,
				version,
				dist: { ...baseVersion.dist, tarball: tarballUrlOf(name, version) }
			}
		},
		_attachments: {
			[tarballName]: packagePublishPayload._attachments["mock-1.0.0.tgz"]
		}
	};
};

/** Publishes a payload with the given registry token. `packageName` is the URL form (`@scope%2fname` for scoped packages). */
export const publishPackage = async (packageName: string, payload: PublishPayload, token: string) => {
	return httpTestClient[":packageName"].$put(
		{ json: payload, param: { packageName } },
		{ headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
	);
};

type AccessJwk = JsonWebKey & { kid: string };

export type AccessSigningKey = {
	kid: string;
	privateJwk: AccessJwk;
	publicJwk: AccessJwk;
};

export const accessIssuer = `https://${env.CF_ACCESS_TEAM_DOMAIN}`;

/** Generates an RS256 key pair the way Cloudflare Access publishes its signing keys. */
export const createAccessSigningKey = async (kid = crypto.randomUUID()): Promise<AccessSigningKey> => {
	const { privateKey, publicKey } = (await crypto.subtle.generateKey(
		{ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
		true,
		["sign", "verify"]
	)) as CryptoKeyPair;

	const exportJwk = (key: CryptoKey) => crypto.subtle.exportKey("jwk", key) as Promise<JsonWebKey>;

	return {
		kid,
		privateJwk: { ...(await exportJwk(privateKey)), kid, alg: "RS256" },
		publicJwk: { ...(await exportJwk(publicKey)), kid, alg: "RS256", use: "sig" }
	};
};

let accessSigningKey: AccessSigningKey | undefined;

/** The key used to sign Access tokens in tests, generated once as it is slow. */
export const getAccessSigningKey = async () => {
	accessSigningKey ??= await createAccessSigningKey();
	return accessSigningKey;
};

/** Serves the given keys from the team's certs endpoint for exactly one request (`fetchMock` must be active). */
export const mockAccessCerts = (...keys: AccessSigningKey[]) => {
	fetchMock
		.get(accessIssuer)
		.intercept({ path: "/cdn-cgi/access/certs" })
		.reply(200, { keys: keys.map(({ publicJwk }) => publicJwk) }, { headers: { "content-type": "application/json" } });
};

/** Signs an Access JWT for the test application. Claims override the defaults of a signed-in administrator. */
export const createAccessToken = async (claims: Record<string, unknown> = {}, key?: AccessSigningKey) => {
	const now = Math.floor(Date.now() / 1000);

	return sign(
		{
			aud: [env.CF_ACCESS_AUD],
			iss: accessIssuer,
			sub: "7335d417-61da-459d-899c-0a01c76a2f94",
			email: "admin@example.com",
			iat: now,
			exp: now + 300,
			...claims
		},
		(key ?? (await getAccessSigningKey())).privateJwk
	);
};

/** Headers of a request authenticated through Cloudflare Access, valid for exactly one request. */
export const createAdminHeaders = async () => {
	const key = await getAccessSigningKey();
	mockAccessCerts(key);

	return { "Cf-Access-Jwt-Assertion": await createAccessToken({}, key) };
};
