import semverRegex from "semver-regex";
import { z } from "zod";
import { validators as tokenValidators } from "#routers/token/validators";

const packageNameParam = z.object({
	packageName: z.string().nonempty()
});

const distTagsSchema = z.record(z.string(), z.string());

const manifestSchema = z.looseObject({
	name: z.string(),
	version: z.string(),
	description: z.string().optional(),
	readme: z.string().optional(),
	dependencies: z.record(z.string(), z.string()).optional(),
	devDependencies: z.record(z.string(), z.string()).optional(),
	peerDependencies: z.record(z.string(), z.string()).optional()
});

export const validators = {
	me: {
		response: {
			200: z.object({
				provider: z.string(),
				subject: z.string(),
				email: z.string().optional()
			})
		}
	},
	packages: {
		list: {
			request: {
				query: z.object({
					search: z.string().optional().describe("Case-insensitive search on the package name"),
					page: z.coerce.number().int().min(1).default(1),
					limit: z.coerce.number().int().min(1).max(100).default(20)
				})
			},
			response: {
				200: z.object({
					items: z.array(
						z.object({
							name: z.string(),
							latestVersion: z.string().nullable(),
							distTags: distTagsSchema,
							versionCount: z.number(),
							createdAt: z.number(),
							updatedAt: z.number()
						})
					),
					total: z.number(),
					page: z.number(),
					limit: z.number()
				})
			}
		},
		get: {
			request: {
				param: packageNameParam
			},
			response: {
				200: z.object({
					name: z.string(),
					description: z.string().nullable(),
					latestVersion: z.string().nullable(),
					distTags: distTagsSchema,
					versions: z.array(
						z.object({
							version: z.string(),
							tag: z.string(),
							createdAt: z.number()
						})
					),
					createdAt: z.number(),
					updatedAt: z.number()
				})
			}
		},
		version: {
			request: {
				param: packageNameParam.extend({
					version: z.string().regex(semverRegex(), { message: "Version is not in semver format" })
				})
			},
			response: {
				200: z.object({
					version: z.string(),
					tag: z.string(),
					createdAt: z.number(),
					manifest: manifestSchema
				})
			}
		}
	},
	tokens: {
		list: tokenValidators.list,
		post: tokenValidators.post,
		get: tokenValidators.get,
		delete: tokenValidators.delete
	}
};
