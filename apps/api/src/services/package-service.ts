import { env } from "cloudflare:workers";
import { and, asc, count, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "#db/index";
import { packageReleaseTable, packageTable } from "#db/schema";
import type { validators } from "#routers/package/validators";
import { base64ToReadableStream } from "#utils/common";
import { HttpError } from "#utils/http";

/** The subset of a published manifest the admin area reads. Everything else is passed through untouched. */
type Manifest = {
	description?: string;
	readme?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	[key: string]: unknown;
};

/** Escapes `%`, `_` and `\` so a search term is matched literally by `LIKE`. */
const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, "\\$&");

export const packageService = {
	/** Lists packages for the admin area, alphabetically, with an optional case-insensitive name search. */
	async listPackages({ search, page, limit }: { search?: string; page: number; limit: number }) {
		const filter = search ? sql`${packageTable.name} LIKE ${`%${escapeLikePattern(search)}%`} ESCAPE '\\'` : undefined;

		const [[totalRow], rows] = await db.batch([
			db.select({ total: count() }).from(packageTable).where(filter),
			db
				.select({
					name: packageTable.name,
					distTags: packageTable.distTags,
					versionCount: count(packageReleaseTable.version),
					createdAt: packageTable.createdAt,
					updatedAt: packageTable.updatedAt
				})
				.from(packageTable)
				.leftJoin(packageReleaseTable, eq(packageReleaseTable.package, packageTable.name))
				.where(filter)
				.groupBy(packageTable.name)
				.orderBy(asc(packageTable.name))
				.limit(limit)
				.offset((page - 1) * limit)
		]);

		return {
			items: rows.map((row) => ({ ...row, latestVersion: row.distTags.latest ?? null })),
			total: totalRow?.total ?? 0,
			page,
			limit
		};
	},

	/** Describes a package for the admin area: its dist-tags and every published version, newest first. */
	async getPackageDetails(packageName: string) {
		const publishedPackage = await db.query.packageTable.findFirst({
			where: (table, { eq }) => eq(table.name, packageName),
			with: {
				packageReleases: {
					columns: { version: true, tag: true, createdAt: true },
					orderBy: (table, { desc }) => desc(table.createdAt)
				}
			}
		});

		if (!publishedPackage) {
			return undefined;
		}

		const latestVersion = publishedPackage.distTags.latest ?? publishedPackage.packageReleases[0]?.version ?? null;

		const latestRelease = latestVersion
			? await db.query.packageReleaseTable.findFirst({
					columns: { manifest: true },
					where: (table, { and, eq }) => and(eq(table.package, packageName), eq(table.version, latestVersion))
				})
			: undefined;

		const latestManifest = (latestRelease?.manifest ?? {}) as Manifest;

		return {
			name: publishedPackage.name,
			description: latestManifest.description ?? null,
			latestVersion,
			distTags: publishedPackage.distTags,
			versions: publishedPackage.packageReleases,
			createdAt: publishedPackage.createdAt,
			updatedAt: publishedPackage.updatedAt
		};
	},

	/** Returns a published version with its manifest as published, which holds the readme and dependencies. */
	async getPackageVersion(packageName: string, version: string) {
		const release = await db.query.packageReleaseTable.findFirst({
			where: and(eq(packageReleaseTable.package, packageName), eq(packageReleaseTable.version, version))
		});

		if (!release) {
			return undefined;
		}

		return {
			version: release.version,
			tag: release.tag,
			createdAt: release.createdAt,
			manifest: release.manifest as Manifest
		};
	},

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
		if (!tarballMetadata || !("package" in tarballMetadata) || tarballMetadata.package !== packageName) {
			// The tarball is not going to be sent: release its stream instead of leaving it open.
			await packageTarball.body.cancel();
			throw HttpError.internalServerError();
		}

		return packageTarball;
	}
};
