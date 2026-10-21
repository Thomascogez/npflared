import { type DescribeRouteOptions, resolver } from "hono-openapi";
import { z } from "zod";

const errorSchema = z.object({
	error: z.string(),
	statusCode: z.number()
});

export const standardOpenApiErrorResponses = {
	400: {
		description: "Bad Request",
		content: {
			"application/json": {
				schema: resolver(errorSchema)
			}
		}
	},
	403: {
		description: "Forbidden",
		content: {
			"application/json": {
				schema: resolver(errorSchema)
			}
		}
	},
	404: {
		description: "Not Found",
		content: {
			"application/json": {
				schema: resolver(errorSchema)
			}
		}
	},
	500: {
		description: "Internal Server Error",
		content: {
			"application/json": {
				schema: resolver(errorSchema)
			}
		}
	}
} satisfies DescribeRouteOptions["responses"];

/** Error responses of the admin routes, which are guarded by the admin authentication provider. */
export const adminOpenApiErrorResponses = {
	...standardOpenApiErrorResponses,
	401: {
		description: "Unauthorized",
		content: {
			"application/json": {
				schema: resolver(errorSchema)
			}
		}
	},
	503: {
		description: "Admin authentication is not configured",
		content: {
			"application/json": {
				schema: resolver(errorSchema)
			}
		}
	}
} satisfies DescribeRouteOptions["responses"];
