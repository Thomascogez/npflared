import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

type ErrorBody = {
	error: string;
	statusCode: number;
};

export class HttpError extends HTTPException {
	constructor(status: ContentfulStatusCode, body: ErrorBody) {
		super(status, { message: JSON.stringify(body) });
	}

	static notFound(message = "Not found") {
		return new HttpError(404, { error: message, statusCode: 404 });
	}

	static forbidden(message = "Forbidden") {
		return new HttpError(403, { error: message, statusCode: 403 });
	}

	static badRequest(message = "Bad request") {
		return new HttpError(400, { error: message, statusCode: 400 });
	}

	static unauthorized(message = "Unauthorized") {
		return new HttpError(401, { error: message, statusCode: 401 });
	}

	static internalServerError(message = "Internal server error") {
		return new HttpError(500, { error: message, statusCode: 500 });
	}

	static conflict(message = "Conflict") {
		return new HttpError(409, { error: message, statusCode: 409 });
	}

	static fromError(error: Error) {
		return new HttpError(500, {
			error: error.message,
			statusCode: 500
		});
	}
}
