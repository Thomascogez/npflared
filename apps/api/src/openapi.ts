import { type DescribeRouteOptions, resolver } from "hono-openapi";
import { z } from "zod";

export const errorSchema = z.object({
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
