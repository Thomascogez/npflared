import { env } from "cloudflare:workers";
import { sql } from "drizzle-orm";
import type z from "zod";
import { db } from "#db/index";
import { packageReleaseTable, packageTable } from "#db/schema";
import type { putPackageValidators } from "#routers/package/validators";
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

		return {
			_id: publishedPackage.name,
			name: publishedPackage.name,
			"dist-tags": publishedPackage.distTags,
			versions
		};
	},

	async putPackage(packageName: string, packageData: z.infer<typeof putPackageValidators.json>) {
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

		if (!packageData.versions[versionToUpload].dist.tarball.endsWith(`${packageName}/-/${expectedAttachmentName}`)) {
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
