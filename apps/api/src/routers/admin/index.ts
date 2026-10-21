import { describeRoute, resolver } from "hono-openapi";
import { adminOpenApiErrorResponses } from "#openapi";
import { $ } from "#utils/factory";
import { HttpError } from "#utils/http";
import { adminPackageRouter } from "./packages";
import { adminTokenRouter } from "./tokens";
import { validators } from "./validators";

export const adminRouter = $.createApp()
	.get(
		"/_/admin/api/me",
		describeRoute({
			description:
				"Get the identity of the authenticated administrator, as established by the admin authentication provider",
			responses: {
				...adminOpenApiErrorResponses,
				200: {
					description: "Administrator identity",
					content: {
						"application/json": {
							schema: resolver(validators.me.response[200])
						}
					}
				}
			}
		}),
		(c) => {
			const admin = c.get("admin");

			if (!admin) {
				throw HttpError.unauthorized();
			}

			return c.json(admin);
		}
	)
	.route("/", adminPackageRouter)
	.route("/", adminTokenRouter);
