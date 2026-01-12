import semverRegex from "semver-regex";
import { z } from "zod";

export const getPackageValidators = {
	param: z.object({
		packageName: z.string().nonempty()
	})
};

export const putPackageValidators = {
	param: z.object({
		packageName: z.string().nonempty()
	}),
	json: z.object({
		_id: z.string().min(1),
		name: z.string().min(1),
		"dist-tags": z.record(z.string(), z.string()),
		versions: z.record(
			z.string().refine((value) => semverRegex().test(value), { message: "Version is not in semver format" }),
			z.object({
				_id: z.string().min(1),
				name: z.string().min(1),
				type: z.string().optional(),
				version: z
					.string()
					.refine((value) => semverRegex().test(value), { message: "Version is not in semver format" }),
				readme: z.string(),
				scripts: z.record(z.string(), z.string()).optional(),
				devDependencies: z.record(z.string(), z.string()).optional(),
				dependencies: z.record(z.string(), z.string()).optional(),
				_nodeVersion: z.string().optional(),
				_npmVersion: z.string().optional(),
				dist: z.object({
					integrity: z.string(),
					shasum: z.string(),
					tarball: z.string()
				})
			})
		),
		_attachments: z.record(
			z.string(),
			z.object({
				content_type: z.string(),
				data: z.string(),
				length: z.number()
			})
		)
	})
};

export const getPackageTarballValidators = {
	param: z.object({
		packageName: z.string().nonempty(),
		tarballName: z.string().nonempty()
	})
};

export const getScopePackageTarballValidators = {
	param: z.object({
		packageScope: z.string().nonempty(),
		packageName: z.string().nonempty(),
		tarballName: z.string().nonempty(),
		tarballScope: z.string().nonempty()
	})
};
