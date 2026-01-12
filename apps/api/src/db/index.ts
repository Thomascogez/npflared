import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

import * as relations from "./relations";
import * as schemas from "./schema";

export const db = drizzle(env.DB, {
	schema: {
		...schemas,
		...relations
	}
});
