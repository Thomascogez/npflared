import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { openAPIRouteHandler } from "hono-openapi";

import { loadToken } from "#middlewares/load-token";
import { packageRouter } from "#routers/package/index";
import { tokenRouter } from "#routers/token/index";
import { uiRouter } from "#ui/router";
import { version } from "../package.json";
import { logger } from "hono/logger";

const app = new Hono();

// Mount UI routes first (public, no auth)
// Handle trailing-slash redirect at the app level to avoid Vite SSR middleware conflicts
app.get("/ui", (c) => c.redirect("/ui/packages", 301));
app.route("/ui", uiRouter);

// API routes with CORS and auth
// app.use("*", cors());
app.use("*", loadToken);
app.use("*", logger());

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
