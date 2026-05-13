import { createExecutionContext, env } from "cloudflare:test";
import type { InferRequestType } from "hono/client";
import { testClient } from "hono/testing";
import app, { type Routes } from "#index";
import packagePublishPayload from "./mocks/package-publish-payload.json";

const executionCtx = createExecutionContext();
export const httpTestClient = testClient<Routes>(app, env, executionCtx);

export const createToken = async (
	body: InferRequestType<(typeof httpTestClient)["-"]["npm"]["v1"]["tokens"]["$post"]>["json"] = {
		name: crypto.randomUUID(),
		scopes: [{ type: "package:read+write", values: ["*"] }]
	}
) => {
	const response = await httpTestClient["-"].npm.v1.tokens.$post(
		{
			json: body
		},
		{
			headers: {
				Authorization: `Bearer ${env.ADMIN_TOKEN}`,
				"Content-Type": "application/json"
			}
		}
	);

	if (!response.ok) {
		throw new Error(`Failed to put token: ${response.statusText}`);
	}
	const responseBody = await response.json();

	return responseBody;
};

export const publishMockPackage = async (body = packagePublishPayload) => {
	const { token } = await createToken({
		name: "test-token",
		scopes: [{ type: "package:write", values: ["mock"] }]
	});

	const response = await httpTestClient[":packageName"].$put(
		{
			json: body,
			param: { packageName: "mock" }
		},
		{
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`
			}
		}
	);

	if (!response.ok) {
		throw new Error(`Failed to publish package: ${response.statusText}`);
	}

	return response;
};
