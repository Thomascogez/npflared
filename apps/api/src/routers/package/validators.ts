import semverRegex from "semver-regex";
import { z } from "zod";

const packageSchema = z.object({
	_id: z.string(),
	name: z.string(),
	"dist-tags": z.record(z.string(), z.string()),
	versions: z.record(z.string(), z.any())
});

export const validators = {
	get: {
		request: {
			param: z.object({
				packageName: z.string().nonempty()
			})
		},
		response: {
			200: packageSchema
		}
	},
	put: {
		request: {
			param: z.object({
				packageName: z.string().nonempty()
			}),
			json: z.object({
				_id: z.string().min(1),
				name: z.string().min(1),
				"dist-tags": z.record(z.string(), z.string()),
				versions: z.record(
					z.string().regex(semverRegex(), { message: "Version is not in semver format" }),
					z.object({
						_id: z.string().min(1),
						name: z.string().min(1),
						type: z.string().optional(),
						version: z.string().regex(semverRegex(), { message: "Version is not in semver format" }),
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
		},
		response: {
			200: z.object({ message: z.string() })
		}
	},
	tarball: {
		get: {
			request: {
				param: z.object({
					packageName: z.string().nonempty(),
					tarballName: z.string().nonempty()
				})
			},
			response: {
				200: z.file()
			}
		},
		scoped: {
			get: {
				request: {
					param: z.object({
						packageScope: z.string().nonempty(),
						packageName: z.string().nonempty(),
						tarballScope: z.string().nonempty(),
						tarballName: z.string().nonempty()
					})
				},
				response: {
					200: z.file()
				}
			}
		}
	}
};
