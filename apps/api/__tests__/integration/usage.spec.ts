import { createExecutionContext, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import app from "#index";
import { httpTestClient } from "../utils";

/** The snippets are syntax highlighted: compare their text rather than their markup. */
const textOf = (page: string) => page.replace(/<[^>]+>/g, "");

describe("usage page", () => {
	it("should explain how to use the registry at its root, without authentication", async () => {
		const response = await httpTestClient.index.$get();

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("text/html");

		const page = await response.text();
		expect(page).toContain("<!DOCTYPE html>");
		expect(page).toContain('<pre class="twinkleplop">');
		expect(textOf(page)).toContain("//localhost/:_authToken=");
		expect(textOf(page)).toContain("@acme:registry=http://localhost/");
		// Quotes are escaped in the markup; browsers render them back.
		expect(textOf(page)).toContain("&quot;registry&quot;: &quot;http://localhost/&quot;");
		expect(page).toContain('href="/_/admin"');
		expect(page).toContain('href="/_/docs"');
		expect(page).not.toContain("documentation</a>");
	});

	it("should use the address the registry is reached at", async () => {
		const response = await app.request("https://registry.example.com/", undefined, env, createExecutionContext());

		expect(response.status).toBe(200);

		const page = await response.text();
		expect(page).toContain("<title>registry.example.com");
		expect(textOf(page)).toContain("//registry.example.com/:_authToken=");
		expect(textOf(page)).toContain("https://registry.example.com/");
	});

	it("should not get in the way of the registry routes", async () => {
		const response = await httpTestClient["-"].npm.v1.tokens.$get(
			{},
			{ headers: { Authorization: `Bearer ${env.ADMIN_TOKEN}` } }
		);

		expect(response.status).toBe(200);
	});
});
