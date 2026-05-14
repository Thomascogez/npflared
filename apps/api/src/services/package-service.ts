import { env } from "cloudflare:workers";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "#db/index";
import { packageReleaseTable, packageTable } from "#db/schema";
import type { validators } from "#routers/package/validators";
import { base64ToReadableStream } from "#utils/common";
import { HttpError } from "#utils/http";

export const packageService = {
	async getPackage(packageName: string) {
		const publishedPackage = await db.query.packageTable.findFirst({
			with: { packageReleases: true },
			where: (table, { eq }) => eq(table.name, packageName)
		});

		if (!publishedPackage) {
			return undefined;
		}

		const versions = publishedPackage.packageReleases.reduce(
			(versions, { version, manifest }) => {
				versions[version] = manifest;
				return versions;
			},
			{} as Record<string, unknown>
		);

		const time: Record<string, string> = {
			created: new Date(publishedPackage.createdAt).toISOString(),
			modified: new Date(publishedPackage.updatedAt).toISOString()
		};

		publishedPackage.packageReleases.forEach((release) => {
			time[release.version] = new Date(release.createdAt).toISOString();
		});

		return {
			_id: publishedPackage.name,
			name: publishedPackage.name,
			"dist-tags": publishedPackage.distTags,
			versions,
			time
		};
	},

	async listPackages() {
		const packages = await db.query.packageTable.findMany({
			with: { packageReleases: true },
			orderBy: (table, { desc }) => desc(table.updatedAt)
		});

		return packages.map((pkg) => {
			const distTagKeys = Object.keys(pkg.distTags);
			const latestTag = pkg.distTags.latest ?? (distTagKeys.length > 0 ? pkg.distTags[distTagKeys[0]!] : undefined);
			const latestRelease = pkg.packageReleases.find((r) => r.version === latestTag);
			const description =
				(typeof latestRelease?.manifest === "object" &&
					latestRelease?.manifest !== null &&
					"description" in latestRelease.manifest &&
					typeof latestRelease.manifest.description === "string" &&
					latestRelease.manifest.description) ||
				"No description provided.";
			const license =
				(typeof latestRelease?.manifest === "object" &&
					latestRelease?.manifest !== null &&
					"license" in latestRelease.manifest &&
					typeof latestRelease.manifest.license === "string" &&
					latestRelease.manifest.license) ||
				"Unknown";

			return {
				name: pkg.name,
				distTags: pkg.distTags,
				latestVersion: latestTag ?? "unknown",
				description,
				license,
				releaseCount: pkg.packageReleases.length,
				createdAt: pkg.createdAt,
				updatedAt: pkg.updatedAt,
				versions: pkg.packageReleases.map((r) => ({
					version: r.version,
					tag: r.tag,
					createdAt: r.createdAt,
					manifest: r.manifest
				}))
			};
		});
	},

	async putPackage(packageName: string, packageData: z.infer<typeof validators.put.request.json>) {
		const tag = Object.keys(packageData["dist-tags"]).at(0);
		if (!tag) {
			throw HttpError.badRequest("No tag");
		}

		const versionToUpload = Object.keys(packageData.versions).at(0);
		if (!versionToUpload) {
			throw HttpError.badRequest("No versions");
		}

		const conflictingPackageRelease = await db.query.packageReleaseTable.findFirst({
			columns: { version: true },
			where: (table, { eq, and }) => and(eq(table.package, packageName), eq(table.version, versionToUpload))
		});

		if (conflictingPackageRelease) {
			throw HttpError.conflict("Version already exists");
		}

		const attachmentName = Object.keys(packageData._attachments ?? {}).at(0);
		if (!attachmentName) {
			throw HttpError.badRequest("No attachment");
		}

		const expectedAttachmentName = `${packageName}-${versionToUpload}.tgz`;

		if (attachmentName !== expectedAttachmentName) {
			throw HttpError.badRequest("Attachment name does not match");
		}

		if (!packageData.versions[versionToUpload]?.dist.tarball?.endsWith(`${packageName}/-/${expectedAttachmentName}`)) {
			throw HttpError.badRequest("Attachment name does not match");
		}

		const attachment = Object.values(packageData._attachments ?? {}).at(0);
		if (!attachment) {
			throw HttpError.badRequest("No attachment");
		}

		const now = Date.now();

		const [insertedPackage, insertedPackageVersion] = await db.batch([
			db
				.insert(packageTable)
				.values({
					name: packageName,
					createdAt: now,
					updatedAt: now,
					distTags: packageData["dist-tags"]
				})
				.onConflictDoUpdate({
					target: packageTable.name,
					set: {
						updatedAt: now,
						distTags: sql`json_patch(${packageTable.distTags}, ${JSON.stringify(packageData["dist-tags"])})`
					}
				})
				.returning(),
			db
				.insert(packageReleaseTable)
				.values({
					package: packageName,
					version: versionToUpload,
					tag,
					manifest: packageData.versions[versionToUpload],
					createdAt: now
				})
				.returning()
		]);

		const uploadStream = new FixedLengthStream(attachment.length);

		base64ToReadableStream(attachment.data).pipeTo(uploadStream.writable);

		await env.BUCKET.put(attachmentName, uploadStream.readable, {
			httpMetadata: { contentType: "application/gzip" },
			customMetadata: { package: packageName, version: versionToUpload }
		});

		return {
			package: insertedPackage[0],
			packageVersion: insertedPackageVersion[0]
		};
	},

	async getPackageTarball(packageName: string, tarballName: string) {
		const packageTarball = await env.BUCKET.get(tarballName);
		if (!packageTarball) {
			throw HttpError.notFound();
		}

		const tarballMetadata = packageTarball.customMetadata;
		if (!tarballMetadata) {
			throw HttpError.internalServerError();
		}

		if (!("package" in tarballMetadata)) {
			throw HttpError.internalServerError();
		}

		if (tarballMetadata.package !== packageName) {
			throw HttpError.internalServerError();
		}

		return packageTarball;
	}
};
