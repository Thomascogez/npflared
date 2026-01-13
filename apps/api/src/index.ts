import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPIRouteHandler } from "hono-openapi";

import { loadToken } from "#middlewares/load-token";
import { packageRouter } from "#routers/package/index";
import { tokenRouter } from "#routers/token/index";
import { version } from "../package.json";

const app = new Hono();

app.use("*", loadToken);

const routes = app.route("/", tokenRouter).route("/", packageRouter);

app
	.get(
		"/_/openapi.json",
		openAPIRouteHandler(routes, {
			documentation: {
				info: {
					title: "Npflared registry",
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
