import { z } from "zod";

export const postTokenValidators = {
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
};

export const getTokenValidators = {
	param: z.object({
		token: z.string().nonempty()
	})
};

export const deleteTokenValidators = {
	param: z.object({
		token: z.string().nonempty()
	})
};
