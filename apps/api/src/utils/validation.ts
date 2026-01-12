// biome-ignore lint/style/noRestrictedImports: It's the only time we import from @hono/zod-validator
import { zValidator as zv } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodType } from "zod";
import { HttpError } from "./http";

export const zValidator = <T extends ZodType, Target extends keyof ValidationTargets>(target: Target, schema: T) =>
	zv(target, schema, (result) => {
		if (!result.success) {
			throw HttpError.badRequest(result.error.issues.flat().at(0)?.message);
		}
	});
