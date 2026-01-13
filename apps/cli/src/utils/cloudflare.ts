import { z } from "zod";
import { $, ProcessOutput } from "zx";
import type { D1Database, R2Bucket } from "../types";

const createD1DatabaseOutputSchema = z.object({
	d1_databases: z
		.array(
			z.object({
				binding: z.string(),
				database_name: z.string(),
				database_id: z.string()
			})
		)
		.min(1)
});

const createR2BucketOutputSchema = z.object({
	r2_buckets: z
		.array(
			z.object({
				binding: z.string(),
				bucket_name: z.string()
			})
		)
		.min(1)
});

export const getLocalAccountId = async () => {
	try {
		const result = await $({ quiet: true })`npx -y wrangler whoami`;
		const match = result.stdout.match(/([0-9a-f]{32})/);
		const [accountId] = match ?? [];

		return accountId;
	} catch (error) {
		if (error instanceof ProcessOutput) {
			throw new Error(error.stderr || error.stdout);
		}

		throw error;
	}
};

export const listD1Databases = async () => {
	try {
		const d1Databases: D1Database[] = [];

		const result = await $({ quiet: true })`npx -y wrangler d1 list`;
		const matches = result.stdout.matchAll(/│(.*)│(.*)│(.*)│(.*)│(.*)│(.*)│/gm);

		for (const match of matches) {
			const [, id, name, createdAt, version, numberOfTables, size] = match;

			if (id || name || createdAt || version || numberOfTables || size) {
				d1Databases.push({
					id: id.trim(),
					name: name.trim(),
					createdAt: createdAt.trim(),
					version: version.trim(),
					numberOfTables: Number.parseInt(numberOfTables, 10),
					size: Number.parseInt(size, 10)
				});
			}
		}

		return d1Databases;
	} catch (error) {
		if (error instanceof ProcessOutput) {
			throw new Error(error.stderr || error.stdout);
		}

		throw error;
	}
};

export const listR2Buckets = async () => {
	try {
		const result = await $({ quiet: true })`npx -y wrangler r2 bucket list`;
		const matches = result.stdout.matchAll(/name:(.*)\ncreation_date:(.*)/gim);

		const r2Buckets: R2Bucket[] = [];

		for (const match of matches) {
			const [, name, createdAt] = match;

			if (name || createdAt) {
				r2Buckets.push({
					name: name.trim(),
					createdAt: createdAt.trim()
				});
			}
		}

		return r2Buckets;
	} catch (error) {
		if (error instanceof ProcessOutput) {
			throw new Error(error.stderr || error.stdout);
		}

		throw error;
	}
};

export const createR2Bucket = async (name: string) => {
	try {
		const result = await $({ quiet: true })`npx -y wrangler r2 bucket create ${name}`;
		const match = result.stdout.match(/\{(?:[^{}]*|\{(?:[^{}]*|\{[^{}]*\})*\})*\}/gim);

		const parsedR2Binding = createR2BucketOutputSchema.safeParse(JSON.parse(match?.[0] ?? ""));

		if (!parsedR2Binding.success) {
			throw new Error("Could not properly retrieve R2 bucket binding");
		}

		return parsedR2Binding.data;
	} catch (error) {
		if (error instanceof ProcessOutput) {
			throw new Error(error.stderr || error.stdout);
		}

		throw error;
	}
};

export const createD1Database = async (name: string) => {
	try {
		const result = await $({ quiet: true })`npx -y wrangler d1 create ${name}`;
		const match = result.stdout.match(/\{(?:[^{}]*|\{(?:[^{}]*|\{[^{}]*\})*\})*\}/gim);

		const parsedD1Binding = createD1DatabaseOutputSchema.safeParse(JSON.parse(match?.[0] ?? ""));
		if (!parsedD1Binding.success) {
			throw new Error("Could not properly retrieve D1 database binding");
		}

		return parsedD1Binding.data;
	} catch (error) {
		if (error instanceof ProcessOutput) {
			throw new Error(error.stderr || error.stdout);
		}

		throw error;
	}
};

export const applyD1Migrations = async (d1DatabaseName: string, config: { cwd?: string } = {}) => {
	try {
		await $({ cwd: config.cwd })`npx -y wrangler d1 migrations apply ${d1DatabaseName} --remote --config wrangler.json`;
	} catch (error) {
		if (error instanceof ProcessOutput) {
			throw new Error(error.stderr || error.stdout);
		}

		throw error;
	}
};

export const deploy = async (config: { cwd?: string } = {}) => {
	try {
		const result = await $({ quiet: true, cwd: config.cwd })`npx -y wrangler deploy --config wrangler.json`;
		const match = result.stdout.match(/([a-z0-9-]+\.[a-z0-9-]+\.workers\.dev)/i);

		return match ? `https://${match[0]}` : "<unknown>";
	} catch (error) {
		if (error instanceof ProcessOutput) {
			throw new Error(error.stderr || error.stdout);
		}
		throw error;
	}
};
