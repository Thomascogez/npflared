import { env } from "cloudflare:workers";
import { describeRoute } from "hono-openapi";
import { $ } from "#utils/factory";
import { renderUsagePage } from "./page";

/** The root of a registry explains how to use it. It is public: nothing on it is specific to a user. */
export const usageRouter = $.createApp().get("/", describeRoute({ hide: true }), (c) => {
	const { origin, host } = new URL(c.req.url);

	return c.html(renderUsagePage({ origin, host, docsUrl: env.DOCS_URL || undefined }));
});
