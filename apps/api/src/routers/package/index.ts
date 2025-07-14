import { zValidator } from "@hono/zod-validator";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { createFactory } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { packageReleaseTable, packageTable } from "../../db/schema";
import { loadToken } from "../../middlewares/loadToken";
import { assertTokenAccess } from "../../utils/access";
import { ensureRequestParam, uint8ArrayFromBinaryString } from "../../utils/common";
import { putPackage } from "./validators";

export const packageRouterFactory = createFactory<AppEnv>();

const getPackageHandler = packageRouterFactory.createHandlers(loadToken, async (c) => {
	const db = drizzle(c.env.DB);
	const can = assertTokenAccess(c.get("token"));

	const packageName = ensureRequestParam(c.req, "package");

	const packageQueryResult = await db
		.select()
		.from(packageTable)
		.leftJoin(packageReleaseTable, eq(packageReleaseTable.package, packageTable.name))
		.where(eq(packageTable.name, packageName));

	const { package: publishedPackage } = packageQueryResult.at(0) ?? {};

	if (!publishedPackage) {
		const fallbackRegistryURL = new URL(c.env.FALLBACK_REGISTRY_ENDPOINT);
		fallbackRegistryURL.pathname = `/${packageName}`;

		return await fetch(fallbackRegistryURL);
	}

	if (!can("read", "package", packageName)) {
		throw new HTTPException(403, { message: "Forbidden" });
	}

	const versions = packageQueryResult.reduce(
		(versions, { package_release }) => {
			if (!package_release) {
				return versions;
			}
			versions[package_release.version] = package_release?.manifest;

			return versions;
		},
		{} as Record<string, unknown>
	);

	return c.json({
		_id: publishedPackage.name,
		name: publishedPackage.name,
		"dist-tags": publishedPackage.distTags,
		versions
	});
});

const putPackageHandler = packageRouterFactory.createHandlers(
	loadToken,
	zValidator("json", putPackage.json),
	async (c) => {
		const db = drizzle(c.env.DB);
		const can = assertTokenAccess(c.get("token"));

		const body = c.req.valid("json");
		const packageName = ensureRequestParam(c.req, "package");

		if (!can("write", "package", packageName)) {
			throw new HTTPException(403, { message: "Forbidden" });
		}

		const tag = Object.keys(body["dist-tags"]).at(0);
		if (!tag) {
			throw new HTTPException(400, { message: "No tag" });
		}

		const versionToUpload = Object.keys(body.versions).at(0);
		if (!versionToUpload) {
			throw new HTTPException(400, { message: "No version to upload" });
		}

		const existingReleaseQueryResult = await db
			.select()
			.from(packageReleaseTable)
			.where(and(eq(packageReleaseTable.package, packageName), eq(packageReleaseTable.version, versionToUpload)))
			.limit(1);

		const [existingRelease] = existingReleaseQueryResult;
		if (existingRelease) {
			throw new HTTPException(409, { message: "Version already exists" });
		}

		const attachmentName = Object.keys(body._attachments ?? {}).at(0);
		if (!attachmentName) {
			throw new HTTPException(400, { message: "No attachment" });
		}

		const expectedAttachmentName = `${packageName}-${versionToUpload}.tgz`;

		if (attachmentName !== expectedAttachmentName) {
			throw new HTTPException(400, { message: "Attachment name does not match" });
		}

		if (!body.versions[versionToUpload].dist.tarball.endsWith(`${packageName}/-/${expectedAttachmentName}`)) {
			throw new HTTPException(400, { message: "Attachment name does not match" });
		}

		const attachment = Object.values(body._attachments ?? {}).at(0);
		if (!attachment) {
			throw new HTTPException(400, { message: "No attachment" });
		}

		const now = Date.now();

		const promises = [];

		promises.push(
			db
				.insert(packageTable)
				.values({
					name: packageName,
					createdAt: now,
					updatedAt: now,
					distTags: body["dist-tags"]
				})
				.onConflictDoUpdate({
					target: packageTable.name,
					set: {
						updatedAt: now,
						distTags: sql`json_patch(${packageTable.distTags}, ${JSON.stringify(body["dist-tags"])})`
					}
				})
		);

		promises.push(
			db.insert(packageReleaseTable).values({
				package: packageName,
				version: versionToUpload,
				tag,
				manifest: body.versions[versionToUpload],
				createdAt: now
			})
		);

		promises.push(
			c.env.BUCKET.put(attachmentName, uint8ArrayFromBinaryString(atob(attachment.data)), {
				customMetadata: { package: packageName, version: versionToUpload }
			})
		);

		await Promise.all(promises);

		return c.json({ message: "ok" });
	}
);

const getPackageTarballHandler = packageRouterFactory.createHandlers(loadToken, async (c) => {
	const can = assertTokenAccess(c.get("token"));

	const packageScope = c.req.param("packageScope");
	const packageName = c.req.param("packageName");

	const tarballScope = c.req.param("tarballScope");
	const tarballName = c.req.param("tarballName");

	const fullPackageName = [packageScope, packageName].filter(Boolean).join("/");
	const fullTarballName = [tarballScope, tarballName].filter(Boolean).join("/");

	if (!can("read", "package", fullPackageName)) {
		throw new HTTPException(403, { message: "Forbidden" });
	}

	const packageTarball = await c.env.BUCKET.get(fullTarballName);
	if (!packageTarball) {
		throw new HTTPException(404, { message: "Package tarball not found" });
	}

	const tarballMetadata = packageTarball.customMetadata;
	if (!tarballMetadata) {
		throw new HTTPException(500, { message: "Invalid tarball metadata" });
	}

	if (!("package" in tarballMetadata)) {
		throw new HTTPException(500, { message: "Invalid tarball metadata" });
	}

	if (tarballMetadata.package !== fullPackageName) {
		throw new HTTPException(500, { message: "Incoherent tarball metadata" });
	}

	return new Response(await packageTarball.arrayBuffer());
});

export const packageRouter = new Hono<AppEnv>()
	.get("/:package", ...getPackageHandler)
	.put("/:package", ...putPackageHandler)
	.get("/:packageName/-/:tarballName", ...getPackageTarballHandler)
	.get("/:packageScope/:packageName/-/:tarballScope/:tarballName", ...getPackageTarballHandler);
