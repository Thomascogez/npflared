type DistTags = Record<string, string>;

type PackageSummary = {
	name: string;
	latestVersion: string | null;
	distTags: DistTags;
	versionCount: number;
	createdAt: number;
	updatedAt: number;
};

export type PackagePage = {
	items: PackageSummary[];
	total: number;
	page: number;
	limit: number;
};

export type PackageDetails = {
	name: string;
	description: string | null;
	latestVersion: string | null;
	distTags: DistTags;
	versions: Array<{ version: string; tag: string; createdAt: number }>;
	createdAt: number;
	updatedAt: number;
};

type Manifest = {
	name: string;
	version: string;
	description?: string;
	readme?: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	[key: string]: unknown;
};

export type PackageVersion = {
	version: string;
	tag: string;
	createdAt: number;
	manifest: Manifest;
};

export const scopeTypes = [
	"package:read",
	"package:write",
	"package:read+write",
	"token:read",
	"token:write",
	"token:read+write",
	"user:read",
	"user:write",
	"user:read+write"
] as const;

export type ScopeType = (typeof scopeTypes)[number];

export type TokenScope = { type: ScopeType; values: string[] };

export type Token = {
	id: string;
	name: string;
	scopes: TokenScope[];
	createdAt: number;
	updatedAt: number;
};

export type CreatedToken = Token & { token: string };

export type Identity = {
	provider: string;
	subject: string;
	email?: string;
};

export class ApiError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
}

const apiBase = "/_/admin/api";

const request = async <T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> => {
	const response = await fetch(apiBase + path, {
		method: init.method ?? "GET",
		headers: {
			accept: "application/json",
			...(init.body === undefined ? {} : { "content-type": "application/json" })
		},
		body: init.body === undefined ? undefined : JSON.stringify(init.body)
	});

	const text = await response.text();
	let body: { error?: string } | undefined;

	try {
		body = JSON.parse(text);
	} catch {
		// Cloudflare Access answers an expired session with a redirect to its login page.
		throw new ApiError(
			response.status,
			response.redirected
				? "Your session has expired. Reload the page to sign in again."
				: `Unexpected response from the registry (${response.status})`
		);
	}

	if (!response.ok) {
		throw new ApiError(response.status, body?.error ?? response.statusText);
	}

	return body as T;
};

const packagePath = (name: string) => `/packages/${encodeURIComponent(name)}`;

export const api = {
	me: () => request<Identity>("/me"),

	listPackages: ({ search = "", page = 1, limit = 20 }: { search?: string; page?: number; limit?: number }) => {
		const params = new URLSearchParams({ page: String(page), limit: String(limit) });

		if (search) {
			params.set("search", search);
		}

		return request<PackagePage>(`/packages?${params}`);
	},

	getPackage: (name: string) => request<PackageDetails>(packagePath(name)),

	getPackageVersion: (name: string, version: string) =>
		request<PackageVersion>(`${packagePath(name)}/versions/${encodeURIComponent(version)}`),

	listTokens: () => request<Token[]>("/tokens"),

	createToken: (body: { name: string; scopes: TokenScope[] }) =>
		request<CreatedToken>("/tokens", { method: "POST", body }),

	revokeToken: (id: string) => request<{ message: string }>(`/tokens/${encodeURIComponent(id)}`, { method: "DELETE" })
};
