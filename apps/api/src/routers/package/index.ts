import { env } from "cloudflare:workers";
import { packageService } from "#services/package-service";
import { assertTokenAccess } from "#utils/access";
import { $ } from "#utils/factory";
import { HttpError } from "#utils/http";
import { zValidator } from "#utils/validation";
import {
	getPackageTarballValidators,
	getPackageValidators,
	getScopePackageTarballValidators,
	putPackageValidators
} from "./validators";

export const packageRouter = $.createApp()
	.get("/:packageName", zValidator("param", getPackageValidators.param), async (c) => {
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
	})
	.put(
		"/:packageName",
		zValidator("param", putPackageValidators.param),
		zValidator("json", putPackageValidators.json),
		async (c) => {
			const can = assertTokenAccess(c.get("token"));

			const { packageName } = c.req.valid("param");
			const body = c.req.valid("json");

			if (!can("write", "package", packageName)) {
				throw HttpError.forbidden();
			}

			await packageService.putPackage(packageName, body);

			return c.json({ message: "ok" }, 201);
		}
	)
	.get("/:packageName/-/:tarballName", zValidator("param", getPackageTarballValidators.param), async (c) => {
		const can = assertTokenAccess(c.get("token"));

		const { packageName, tarballName } = c.req.valid("param");

		if (!can("read", "package", packageName)) {
			throw HttpError.forbidden();
		}

		const packageTarball = await packageService.getPackageTarball(packageName, tarballName);

		return new Response(packageTarball.body);
	})
	.get(
		"/:packageScope/:packageName/-/:tarballScope/:tarballName",
		zValidator("param", getScopePackageTarballValidators.param),
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
