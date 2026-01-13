import type { ValidationTargets } from "hono";
// biome-ignore lint/style/noRestrictedImports: It's the only time we import from hono-openapi for overloading
import { validator as zv } from "hono-openapi";
import type { ZodType } from "zod";
import { HttpError } from "./http";

export const zValidator = <T extends ZodType, Target extends keyof ValidationTargets>(target: Target, schema: T) =>
	zv(target, schema, (result) => {
		if (!result.success) {
			throw HttpError.badRequest(
				result.error
					.flat()
					.map(({ message, path }) => `${path?.join(".") ?? ""}: ${message}`)
					.join(", ")
			);
		}
	});
