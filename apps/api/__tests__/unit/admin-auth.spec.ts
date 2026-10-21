import { describe, expect, it } from "vitest";
import { resolveAdminAuthProvider } from "../../src/admin-auth/index";

const accessConfig = {
	CF_ACCESS_TEAM_DOMAIN: "my-team.cloudflareaccess.com",
	CF_ACCESS_AUD: "0123456789abcdef"
};

describe("resolveAdminAuthProvider", () => {
	it("should default to Cloudflare Access", () => {
		expect(resolveAdminAuthProvider(accessConfig)).to.have.property("name", "cloudflare-access");
		expect(resolveAdminAuthProvider({ ...accessConfig, ADMIN_AUTH_PROVIDER: "" })).to.have.property(
			"name",
			"cloudflare-access"
		);
	});

	it("should resolve Cloudflare Access when explicitly selected", () => {
		expect(resolveAdminAuthProvider({ ...accessConfig, ADMIN_AUTH_PROVIDER: "cloudflare-access" })).to.have.property(
			"name",
			"cloudflare-access"
		);
	});

	it("should resolve nothing when Cloudflare Access is not fully configured", () => {
		expect(resolveAdminAuthProvider({})).toBeUndefined();
		expect(resolveAdminAuthProvider({ CF_ACCESS_TEAM_DOMAIN: accessConfig.CF_ACCESS_TEAM_DOMAIN })).toBeUndefined();
		expect(resolveAdminAuthProvider({ CF_ACCESS_AUD: accessConfig.CF_ACCESS_AUD })).toBeUndefined();
		expect(resolveAdminAuthProvider({ ...accessConfig, CF_ACCESS_TEAM_DOMAIN: "" })).toBeUndefined();
	});

	it("should resolve the local provider without any other configuration", () => {
		expect(resolveAdminAuthProvider({ ADMIN_AUTH_PROVIDER: "local" })).to.have.property("name", "local");
	});

	it("should resolve nothing for an unknown provider", () => {
		expect(resolveAdminAuthProvider({ ...accessConfig, ADMIN_AUTH_PROVIDER: "unknown" })).toBeUndefined();
	});
});
