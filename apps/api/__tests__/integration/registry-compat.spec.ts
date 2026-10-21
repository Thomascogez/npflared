import { createExecutionContext, env, fetchMock } from "cloudflare:test";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import app from "#index";
import packagePublishPayload from "../mocks/package-publish-payload.json";
import {
	createPublishPayload,
	createToken,
	httpTestClient,
	publishMockPackage,
	publishPackage,
	tarballUrlOf
} from "../utils";

/**
 * Regression tests pinning the behaviour npm and pnpm rely on, so that admin features
 * cannot silently change how packages are published, resolved and installed.
 */

const scopedPackageName = "@mock/scoped";
/** npm requests scoped packages as `@scope%2fname`, pnpm as `@scope%2Fname`: both must keep working. */
const npmEncodedScopedPackageName = "@mock%2fscoped";
const pnpmEncodedScopedPackageName = "@mock%2Fscoped";

/** The metadata document npm clients read: the manifests are passed through as published. */
type PackageMetadata = {
	_id: string;
	name: string;
	"dist-tags": Record<string, string>;
	versions: Record<string, { version: string; dist: { tarball: string } } & Record<string, unknown>>;
	time: Record<string, string>;
};

const getPackage = async (packageName: string, token: string) => {
	return httpTestClient[":packageName"].$get(
		{ param: { packageName } },
		{ headers: { Authorization: `Bearer ${token}` } }
	);
};

const getPackageMetadata = async (packageName: string, token: string) => {
	const response = await getPackage(packageName, token);
	expect(response.status).toBe(200);

	return (await response.json()) as PackageMetadata;
};

/** Fetches a tarball from the URL advertised in the package metadata, the way an install does. */
const fetchTarball = (tarballUrl: string, token: string) =>
	app.request(
		new URL(tarballUrl).pathname,
		{ headers: { Authorization: `Bearer ${token}` } },
		env,
		createExecutionContext()
	);

const expectedTarballLength = packagePublishPayload._attachments["mock-1.0.0.tgz"].length;

describe("registry compatibility", () => {
	beforeAll(() => {
		fetchMock.activate();
		fetchMock.disableNetConnect();
	});

	afterEach(() => fetchMock.assertNoPendingInterceptors());

	describe("install flow", () => {
		it("should serve the tarball advertised in the package metadata", async () => {
			await publishMockPackage();
			const { token } = await createToken({ name: "reader", scopes: [{ type: "package:read", values: ["mock"] }] });

			const metadata = await getPackageMetadata("mock", token);
			const latest = metadata["dist-tags"].latest ?? "";
			const tarballUrl = metadata.versions[latest]?.dist.tarball ?? "";
			expect(tarballUrl).toBe(packagePublishPayload.versions["1.0.0"].dist.tarball);

			const tarballResponse = await fetchTarball(tarballUrl, token);
			expect(tarballResponse.status).toBe(200);
			expect((await tarballResponse.arrayBuffer()).byteLength).toBe(expectedTarballLength);
		});

		it("should resolve packages that are not in the registry from the fallback registry", async () => {
			fetchMock.get(env.FALLBACK_REGISTRY_ENDPOINT).intercept({ path: "/lodash" }).reply(200, { name: "lodash" });

			const response = await httpTestClient[":packageName"].$get({ param: { packageName: "lodash" } });

			expect(response.status).toBe(200);
			expect(await response.json()).to.have.property("name", "lodash");
		});
	});

	describe("version metadata", () => {
		it("should expose dist-tags, versions and publication times", async () => {
			const { token } = await createToken({
				name: "publisher",
				scopes: [{ type: "package:read+write", values: ["mock"] }]
			});

			const before = Date.now();
			expect((await publishPackage("mock", packagePublishPayload, token)).status).toBe(200);
			expect(
				(await publishPackage("mock", createPublishPayload("mock", "2.0.0", { next: "2.0.0" }), token)).status
			).toBe(200);
			const after = Date.now();

			const metadata = await getPackageMetadata("mock", token);

			expect(metadata).to.have.property("_id", "mock");
			expect(metadata).to.have.property("name", "mock");
			expect(metadata["dist-tags"]).to.deep.equal({ latest: "1.0.0", next: "2.0.0" });
			expect(Object.keys(metadata.versions)).to.deep.equal(["1.0.0", "2.0.0"]);
			expect(metadata.versions["1.0.0"]).to.deep.equal(packagePublishPayload.versions["1.0.0"]);
			expect(metadata.versions["2.0.0"]).to.have.property("version", "2.0.0");

			const time = metadata.time;
			expect(Object.keys(time)).to.deep.equal(["created", "modified", "1.0.0", "2.0.0"]);
			for (const timestamp of Object.values(time)) {
				const parsed = Date.parse(timestamp);
				expect(timestamp).toBe(new Date(parsed).toISOString());
				expect(parsed).toBeGreaterThanOrEqual(before);
				expect(parsed).toBeLessThanOrEqual(after);
			}
			expect(Date.parse(time.modified ?? "")).toBeGreaterThanOrEqual(Date.parse(time.created ?? ""));
		});

		it("should pass unknown manifest fields through untouched", async () => {
			const { token } = await createToken({
				name: "publisher",
				scopes: [{ type: "package:read+write", values: ["mock"] }]
			});

			const payload = createPublishPayload("mock");
			const manifest = payload.versions["1.0.0"] as Record<string, unknown>;
			manifest.exports = { ".": "./index.js" };
			manifest.engines = { node: ">=20" };

			expect((await publishPackage("mock", payload, token)).status).toBe(200);

			const metadata = await getPackageMetadata("mock", token);
			expect(metadata.versions["1.0.0"]).to.have.property("exports").to.deep.equal({ ".": "./index.js" });
			expect(metadata.versions["1.0.0"]).to.have.property("engines").to.deep.equal({ node: ">=20" });
			expect(metadata.versions["1.0.0"]).to.have.property("license", "MIT");
		});
	});

	describe("scoped packages", () => {
		it("should publish, resolve and install a scoped package the way npm does", async () => {
			const { token } = await createToken({
				name: "publisher",
				scopes: [{ type: "package:read+write", values: [scopedPackageName] }]
			});

			const payload = createPublishPayload(scopedPackageName);
			const publishResponse = await publishPackage(npmEncodedScopedPackageName, payload, token);
			expect(publishResponse.status).toBe(200);

			const metadata = await getPackageMetadata(npmEncodedScopedPackageName, token);
			expect(metadata).to.have.property("_id", scopedPackageName);
			expect(metadata).to.have.property("name", scopedPackageName);
			expect(metadata["dist-tags"]).to.deep.equal({ latest: "1.0.0" });

			const tarballUrl = metadata.versions["1.0.0"]?.dist.tarball ?? "";
			expect(tarballUrl).toBe(`http://localhost:8787/${scopedPackageName}/-/${scopedPackageName}-1.0.0.tgz`);

			const tarballResponse = await fetchTarball(tarballUrl, token);
			expect(tarballResponse.status).toBe(200);
			expect((await tarballResponse.arrayBuffer()).byteLength).toBe(expectedTarballLength);
		});

		it("should resolve a scoped package the way pnpm encodes it", async () => {
			const { token } = await createToken({
				name: "publisher",
				scopes: [{ type: "package:read+write", values: [scopedPackageName] }]
			});

			expect(
				(await publishPackage(npmEncodedScopedPackageName, createPublishPayload(scopedPackageName), token)).status
			).toBe(200);

			const response = await getPackage(pnpmEncodedScopedPackageName, token);
			expect(response.status).toBe(200);
			expect(await response.json()).to.have.property("name", scopedPackageName);
		});

		it("should serve a scoped tarball through the scoped tarball route", async () => {
			const { token } = await createToken({
				name: "publisher",
				scopes: [{ type: "package:read+write", values: [scopedPackageName] }]
			});

			expect(
				(await publishPackage(npmEncodedScopedPackageName, createPublishPayload(scopedPackageName), token)).status
			).toBe(200);

			const response = await httpTestClient[":packageScope"][":packageName"]["-"][":tarballScope"][":tarballName"].$get(
				{
					param: {
						packageScope: "@mock",
						packageName: "scoped",
						tarballScope: "@mock",
						tarballName: "scoped-1.0.0.tgz"
					}
				},
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			expect(response.status).toBe(200);
			expect((await response.arrayBuffer()).byteLength).toBe(expectedTarballLength);
		});

		it("should not publish the same scoped version twice", async () => {
			const { token } = await createToken({
				name: "publisher",
				scopes: [{ type: "package:write", values: [scopedPackageName] }]
			});
			const payload = createPublishPayload(scopedPackageName);

			expect((await publishPackage(npmEncodedScopedPackageName, payload, token)).status).toBe(200);
			expect((await publishPackage(npmEncodedScopedPackageName, payload, token)).status).toBe(409);
		});
	});

	describe("permissions", () => {
		it("should scope permissions to the full scoped package name", async () => {
			const { token: publisher } = await createToken({
				name: "publisher",
				scopes: [{ type: "package:write", values: [scopedPackageName] }]
			});
			expect(
				(await publishPackage(npmEncodedScopedPackageName, createPublishPayload(scopedPackageName), publisher)).status
			).toBe(200);

			const { token: otherScopeReader } = await createToken({
				name: "other-scope-reader",
				scopes: [{ type: "package:read", values: ["@other/scoped", "scoped", "@mock/other"] }]
			});
			expect((await getPackage(npmEncodedScopedPackageName, otherScopeReader)).status).toBe(403);

			const { token: writer } = await createToken({
				name: "writer-only",
				scopes: [{ type: "package:write", values: [scopedPackageName] }]
			});
			expect((await getPackage(npmEncodedScopedPackageName, writer)).status).toBe(403);

			const { token: reader } = await createToken({
				name: "reader",
				scopes: [{ type: "package:read", values: [scopedPackageName] }]
			});
			expect((await getPackage(npmEncodedScopedPackageName, reader)).status).toBe(200);
			expect(
				(await publishPackage(npmEncodedScopedPackageName, createPublishPayload(scopedPackageName, "2.0.0"), reader))
					.status
			).toBe(403);

			const { token: wildcard } = await createToken({
				name: "wildcard",
				scopes: [{ type: "package:read", values: ["*"] }]
			});
			expect((await getPackage(npmEncodedScopedPackageName, wildcard)).status).toBe(200);
		});

		it("should keep scoped tarballs private to readers of the package", async () => {
			const { token: publisher } = await createToken({
				name: "publisher",
				scopes: [{ type: "package:write", values: [scopedPackageName] }]
			});
			expect(
				(await publishPackage(npmEncodedScopedPackageName, createPublishPayload(scopedPackageName), publisher)).status
			).toBe(200);

			const tarballUrl = tarballUrlOf(scopedPackageName, "1.0.0");

			const { token: otherReader } = await createToken({
				name: "other-reader",
				scopes: [{ type: "package:read", values: ["mock"] }]
			});
			expect((await fetchTarball(tarballUrl, otherReader)).status).toBe(403);
			expect((await fetchTarball(tarballUrl, publisher)).status).toBe(403);

			const anonymousResponse = await app.request(
				new URL(tarballUrl).pathname,
				undefined,
				env,
				createExecutionContext()
			);
			expect(anonymousResponse.status).toBe(403);
		});

		it("should not let a token for one package reach another package's tarball", async () => {
			await publishMockPackage();
			const { token } = await createToken({
				name: "other-package-reader",
				scopes: [{ type: "package:read", values: ["other"] }]
			});

			const response = await httpTestClient[":packageName"]["-"][":tarballName"].$get(
				{ param: { packageName: "other", tarballName: "mock-1.0.0.tgz" } },
				{ headers: { Authorization: `Bearer ${token}` } }
			);

			expect(response.status).not.toBe(200);
		});
	});
});
