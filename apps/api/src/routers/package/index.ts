import { env } from "cloudflare:workers";
import { describeRoute, resolver } from "hono-openapi";
import { standardOpenApiErrorResponses } from "#openapi";
import { packageService } from "#services/package-service";
import { assertTokenAccess } from "#utils/access";
import { $ } from "#utils/factory";
import { HttpError } from "#utils/http";
import { zValidator } from "#utils/validation";
import { validators } from "./validators";

export const packageRouter = $.createApp()
	.get(
		"/:packageName",
		describeRoute({
			description: "Get a package by it's name from the registry or the fallback registry",
			responses: {
				...standardOpenApiErrorResponses,
				200: {
					description: "Returns the package",
					content: {
						"application/json": {
							schema: resolver(validators.get.response[200])
						}
					}
				}
			}
		}),
		zValidator("param", validators.get.request.param),
		async (c) => {
			const { packageName } = c.req.valid("param");
			const can = assertTokenAccess(c.get("token"));

			const publishedPackage = await packageService.getPackage(packageName);

			if (!publishedPackage) {
				if (env.FALLBACK_REGISTRY_ENDPOINT) {
					const fallbackRegistryURL = new URL(env.FALLBACK_REGISTRY_ENDPOINT);
					fallbackRegistryURL.pathname = `/${packageName}`;
					return fetch(fallbackRegistryURL);
				}

				throw HttpError.notFound();
			}

			if (!can("read", "package", packageName)) {
				throw HttpError.forbidden();
			}

			return c.json(publishedPackage);
		}
	)
	.put(
		"/:packageName",
		describeRoute({
			description: "Create or update a package by publishing a new version",
			responses: {
				...standardOpenApiErrorResponses,
				200: {
					description: "Package updated success message",
					content: {
						"application/json": {
							schema: resolver(validators.put.response[200])
						}
					}
				}
			}
		}),
		zValidator("param", validators.put.request.param),
		zValidator("json", validators.put.request.json),
		async (c) => {
			const can = assertTokenAccess(c.get("token"));

			const { packageName } = c.req.valid("param");
			const body = c.req.valid("json");

			if (!can("write", "package", packageName)) {
				throw HttpError.forbidden();
			}

			await packageService.putPackage(packageName, body);

			return c.json({ message: "ok" });
		}
	)
	.get(
		"/:packageName/-/:tarballName",
		describeRoute({
			description: "Get a package tarball by it's name from the registry",
			responses: {
				...standardOpenApiErrorResponses,
				200: {
					description: "Package tarball",
					content: {
						"application/octet-stream": {
							schema: resolver(validators.tarball.get.response[200])
						}
					}
				}
			}
		}),
		zValidator("param", validators.tarball.get.request.param),
		async (c) => {
			const can = assertTokenAccess(c.get("token"));

			const { packageName, tarballName } = c.req.valid("param");

			if (!can("read", "package", packageName)) {
				throw HttpError.forbidden();
			}

			const packageTarball = await packageService.getPackageTarball(packageName, tarballName);

			return new Response(packageTarball.body);
		}
	)
	.get(
		"/:packageScope/:packageName/-/:tarballScope/:tarballName",
		describeRoute({
			description: "Get a scoped package tarball by it's name from the registry",
			responses: {
				...standardOpenApiErrorResponses,
				200: {
					description: "Package tarball",
					content: {
						"application/octet-stream": {
							schema: resolver(validators.tarball.scoped.get.response[200])
						}
					}
				}
			}
		}),
		zValidator("param", validators.tarball.scoped.get.request.param),
		async (c) => {
			const can = assertTokenAccess(c.get("token"));

			const { packageScope, packageName, tarballScope, tarballName } = c.req.valid("param");

			const scopedPackageName = `${packageScope}/${packageName}`;
			const scopedTarballName = `${tarballScope}/${tarballName}`;

			if (!can("read", "package", scopedPackageName)) {
				throw HttpError.forbidden();
			}

			const packageTarball = await packageService.getPackageTarball(scopedPackageName, scopedTarballName);

			return new Response(packageTarball.body);
		}
	);
