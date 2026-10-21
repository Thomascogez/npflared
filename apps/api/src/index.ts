import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";
import { PRODUCT_NAME } from "#brand";
import { adminAuth } from "#middlewares/admin-auth";
import { loadToken } from "#middlewares/load-token";
import { adminRouter } from "#routers/admin/index";
import { packageRouter } from "#routers/package/index";
import { tokenRouter } from "#routers/token/index";
import { usageRouter } from "#routers/usage/index";
import { version } from "../package.json";

const app = new Hono();

app.use("*", loadToken);
// The admin area lives under `/_/`, which can never be a package name. Matches `/_/admin` itself as well as everything below it.
app.use("/_/admin/*", adminAuth);

const routes = app.route("/", usageRouter).route("/", adminRouter).route("/", tokenRouter).route("/", packageRouter);

app
	.get(
		"/_/openapi.json",
		openAPIRouteHandler(routes, {
			documentation: {
				info: {
					title: `${PRODUCT_NAME} registry`,
					version: version
				},
				security: [
					{
						bearerAuth: []
					}
				]
			}
		})
	)
	.get(
		"/_/docs",
		Scalar({
			theme: "saturn",
			url: "/_/openapi.json"
		})
	);

export type Routes = typeof routes;

export default app;
