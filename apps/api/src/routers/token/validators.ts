import { z } from "zod";

const tokenSchema = z.object({
	token: z.string(),
	name: z.string(),
	scopes: z.array(z.object({ type: z.string(), values: z.array(z.string()) })),
	createdAt: z.number(),
	updatedAt: z.number()
});

export const validators = {
	post: {
		request: {
			json: z.object({
				name: z.string(),
				scopes: z
					.array(
						z.object({
							type: z.enum([
								"package:read",
								"package:write",
								"package:read+write",

								"user:read",
								"user:write",
								"user:read+write",

								"token:read",
								"token:write",
								"token:read+write"
							]),
							values: z.array(z.string())
						})
					)
					.min(1)
			})
		},
		response: {
			201: tokenSchema
		}
	},
	get: {
		request: {
			param: z.object({
				token: z.string().nonempty()
			})
		},
		response: {
			200: tokenSchema
		}
	},
	list: {
		response: {
			200: z.array(tokenSchema)
		}
	},
	delete: {
		request: {
			param: z.object({
				token: z.string().nonempty()
			})
		},
		response: {
			200: z.object({ message: z.string() })
		}
	}
};
