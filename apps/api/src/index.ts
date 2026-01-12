import { Hono } from "hono";
import { loadToken } from "#middlewares/loadToken";
import { packageRouter } from "./routers/package";
import { tokenRouter } from "./routers/token";

const app = new Hono();

app.use("*", loadToken);

const routes = app.route("/", tokenRouter).route("/", packageRouter);

export type Routes = typeof routes;

export default app;
