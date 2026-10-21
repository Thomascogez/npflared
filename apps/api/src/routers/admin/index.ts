import { env } from "cloudflare:workers";
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
	.route("/", adminTokenRouter)
	.get(
		"/_/admin/*",
		describeRoute({ hide: true }),
		/**
		 * Serves the admin UI, which the Cloudflare Vite plugin builds into the worker's static assets.
		 * The assets live at the root of the client build, so the admin prefix is dropped before looking
		 * one up, and deep links are answered with the app shell, which routes them itself.
		 */
		async (c) => {
			if (c.req.path.startsWith("/_/admin/api/")) {
				throw HttpError.notFound();
			}

			const assetUrl = new URL(c.req.url);
			assetUrl.pathname = assetUrl.pathname.replace(/^\/_\/admin\/?/, "/");

			const asset = await env.ASSETS.fetch(new Request(assetUrl, { headers: c.req.raw.headers }));

			if (asset.status !== 404) {
				return asset;
			}

			const shell = await env.ASSETS.fetch(new URL("/index.html", c.req.url));

			if (shell.status === 404) {
				throw HttpError.notFound("The admin UI has not been built");
			}

			return shell;
		}
	);
