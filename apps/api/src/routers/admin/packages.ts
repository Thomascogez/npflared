import { describeRoute, resolver } from "hono-openapi";
import { adminOpenApiErrorResponses } from "#openapi";
import { packageService } from "#services/package-service";
import { $ } from "#utils/factory";
import { HttpError } from "#utils/http";
import { zValidator } from "#utils/validation";
import { validators } from "./validators";

/** Read-only package discovery for the admin area. Scoped names are URL-encoded (`%40scope%2Fname`). */
export const adminPackageRouter = $.createApp()
	.get(
		"/_/admin/api/packages",
		describeRoute({
			description: "List published packages, alphabetically, with pagination and an optional name search",
			responses: {
				...adminOpenApiErrorResponses,
				200: {
					description: "Page of packages",
					content: {
						"application/json": {
							schema: resolver(validators.packages.list.response[200])
						}
					}
				}
			}
		}),
		zValidator("query", validators.packages.list.request.query),
		async (c) => {
			const packages = await packageService.listPackages(c.req.valid("query"));

			return c.json(packages);
		}
	)
	.get(
		"/_/admin/api/packages/:packageName",
		describeRoute({
			description: "Get a package with its dist-tags and published versions",
			responses: {
				...adminOpenApiErrorResponses,
				200: {
					description: "Package details",
					content: {
						"application/json": {
							schema: resolver(validators.packages.get.response[200])
						}
					}
				}
			}
		}),
		zValidator("param", validators.packages.get.request.param),
		async (c) => {
			const { packageName } = c.req.valid("param");

			const packageDetails = await packageService.getPackageDetails(packageName);

			if (!packageDetails) {
				throw HttpError.notFound();
			}

			return c.json(packageDetails);
		}
	)
	.get(
		"/_/admin/api/packages/:packageName/versions/:version",
		describeRoute({
			description: "Get a published version with its manifest, including the readme and dependencies",
			responses: {
				...adminOpenApiErrorResponses,
				200: {
					description: "Published version",
					content: {
						"application/json": {
							schema: resolver(validators.packages.version.response[200])
						}
					}
				}
			}
		}),
		zValidator("param", validators.packages.version.request.param),
		async (c) => {
			const { packageName, version } = c.req.valid("param");

			const packageVersion = await packageService.getPackageVersion(packageName, version);

			if (!packageVersion) {
				throw HttpError.notFound();
			}

			return c.json(packageVersion);
		}
	);
