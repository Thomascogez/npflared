import { z } from "zod";

const tokenSchema = z.object({
	id: z.string(),
	name: z.string(),
	scopes: z.array(z.object({ type: z.string(), values: z.array(z.string()) })),
	createdAt: z.number(),
	updatedAt: z.number()
});

const createdTokenSchema = tokenSchema.extend({
	token: z.string().describe("Plaintext token. It is only returned once, at creation time.")
});

const tokenIdParam = z.object({
	id: z.string().nonempty()
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
			201: createdTokenSchema
		}
	},
	get: {
		request: {
			param: tokenIdParam
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
			param: tokenIdParam
		},
		response: {
			200: z.object({ message: z.string() })
		}
	}
};
