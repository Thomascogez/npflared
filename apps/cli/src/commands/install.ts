import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rename, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { confirm, intro, isCancel, log, outro, select, spinner, text } from "@clack/prompts";
import chalk from "chalk";
import dedent from "dedent";
import degit from "degit";
import { encode } from "uuid-b32";
import { $ } from "zx";
import {
	applyD1Migrations,
	createD1Database,
	createR2Bucket,
	deploy,
	getLocalAccountId,
	listD1Databases,
	listR2Buckets
} from "../utils/cloudflare";
import { pathExists } from "../utils/fs";

const npflaredDirName = ".npflared";
const npflaredDirPath = join(homedir(), npflaredDirName);

const cliSpinner = spinner();

const ensureNpflaredDirExists = async () => {
	try {
		await mkdir(npflaredDirPath, { recursive: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code !== "EEXIST") {
			throw error;
		}
	}
};

const promptD1Database = async (): Promise<{ name: string; id: string }> => {
	const useExistingDatabase = await confirm({ message: "Use an existing D1 database?" });

	if (isCancel(useExistingDatabase)) {
		process.exit(1);
	}

	if (useExistingDatabase) {
		cliSpinner.start("Retrieving D1 databases...");
		const d1Databases = await listD1Databases();
		cliSpinner.stop();

		const d1Database = await select({
			message: "Select a D1 database:",
			options: d1Databases.map((database) => ({
				value: { name: database.name, id: database.id },
				label: `${database.name.padEnd(30)} (${database.id}) - Created at: ${database.createdAt}`
			}))
		});

		if (isCancel(d1Database)) {
			process.exit(1);
		}

		return { name: d1Database.name, id: d1Database.id };
	}

	const d1DatabaseName = await text({
		initialValue: "npflared",
		message: "Enter a name for your D1 database:",
		validate(value) {
			if (value.length === 0) {
				return "Please enter a name for your D1 database";
			}
		}
	});

	if (isCancel(d1DatabaseName)) {
		process.exit(1);
	}

	cliSpinner.start(`Creating D1 database ${d1DatabaseName}...`);
	const results = await createD1Database(d1DatabaseName);
	cliSpinner.stop();

	const [d1Binding] = results.d1_databases;
	if (!d1Binding) {
		console.log(chalk.red(`Could not create D1 database ${d1DatabaseName}`));
		process.exit(1);
	}

	return { name: d1Binding.database_name, id: d1Binding.database_id };
};

const promptR2Bucket = async (): Promise<{ name: string }> => {
	const useExistingBucket = await confirm({
		message: "Use an existing R2 bucket?"
	});

	if (isCancel(useExistingBucket)) {
		process.exit(1);
	}

	if (useExistingBucket) {
		cliSpinner.start("Retrieving R2 buckets...");
		const r2Buckets = await listR2Buckets();
		cliSpinner.stop();

		const r2Bucket = await select({
			message: "Select a R2 bucket:",
			options: r2Buckets.map((bucket) => ({
				value: { name: bucket.name },
				label: `${bucket.name.padEnd(30)} - Created at: ${bucket.createdAt}`
			}))
		});

		if (isCancel(r2Bucket)) {
			process.exit(1);
		}

		return { name: r2Bucket.name };
	}

	const r2BucketName = await text({
		initialValue: "npflared",
		message: "Enter a name for your R2 bucket:",
		validate(value) {
			if (value.length === 0) {
				return "Please enter a name for your R2 bucket";
			}
		}
	});

	if (isCancel(r2BucketName)) {
		process.exit(1);
	}

	cliSpinner.start(`Creating R2 bucket ${r2BucketName}...`);
	const results = await createR2Bucket(r2BucketName);
	cliSpinner.stop();

	const [r2Binding] = results.r2_buckets;
	if (!r2Binding) {
		console.log(chalk.red(`Could not create R2 bucket ${r2BucketName}`));
		process.exit(1);
	}

	return { name: r2Binding.bucket_name };
};

const promptPackageManager = async (): Promise<string> => {
	const packageManager = await select({
		message: "Install dependencies with:",
		options: [
			{ value: "npm", label: "npm" },
			{ value: "pnpm", label: "pnpm" },
			{ value: "yarn", label: "yarn" },
			{ value: "bun", label: "bun" }
		]
	});

	if (isCancel(packageManager)) {
		process.exit(1);
	}

	return packageManager;
};

const promptWorkerName = async (): Promise<string> => {
	const workerName = await text({
		initialValue: "npflared",
		message: "Enter a name for your worker:",
		validate(value) {
			if (value.length === 0) {
				return "Please enter a name for your worker";
			}
		}
	});

	if (isCancel(workerName)) {
		process.exit(1);
	}

	return workerName;
};

const generateAdminToken = async (basePath: string) => {
	cliSpinner.start("Generating admin token...");

	const adminTokenMigrationFileName = "9999_admin-token.sql";
	const adminTokenMigrationFilePath = join(basePath, "migrations", adminTokenMigrationFileName);

	const adminTokenMigrationFileExists = await pathExists(adminTokenMigrationFilePath);
	if (!adminTokenMigrationFileExists) {
		const adminToken = encode(randomUUID());
		const now = Date.now();

		await writeFile(
			adminTokenMigrationFilePath,
			`INSERT INTO token (token, name, scopes, created_at, updated_at) VALUES ('${adminToken}', 'admin-token', '[{"type": "token:read+write", "values": ["*"]}, {"type": "user:read+write", "values": ["*"]}, {"type": "package:read+write", "values": ["*"]}]', ${now}, ${now});`
		);
		cliSpinner.stop(`Admin token migration file generated at ${adminTokenMigrationFilePath}`);
		return adminToken;
	}
	const migrationFileContent = await readFile(adminTokenMigrationFilePath, "utf-8");
	cliSpinner.stop(`Admin token migration file already exists at ${adminTokenMigrationFilePath}`);

	// extract token from migration file
	const match = migrationFileContent.match(
		/INSERT INTO token \(token, name, scopes, created_at, updated_at\) VALUES \('([^']+)'/
	);

	return match?.[0] ?? "";
};

export const install = async () => {
	const cloneTmpDir = await mkdtemp(join(tmpdir(), "npflared-"));

	const cleanup = () => {
		if (cloneTmpDir) {
			rmSync(cloneTmpDir, { recursive: true, force: true });
		}
	};

	process.on("exit", cleanup);
	process.on("SIGINT", cleanup);
	process.on("SIGTERM", cleanup);

	try {
		intro("npflared");

		const repository = degit("Thomascogez/npflared/apps/api");

		cliSpinner.start("Cloning npflared...");
		await repository.clone(cloneTmpDir);

		const packageJsonPath = join(cloneTmpDir, "package.json");
		const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
		const npflaredVersion = packageJson.version;

		await ensureNpflaredDirExists();
		const npflaredCurrentVersionDirectory = join(npflaredDirPath, npflaredVersion);

		const localVersionExists = await pathExists(npflaredCurrentVersionDirectory);
		if (!localVersionExists) {
			await rename(cloneTmpDir, join(npflaredDirPath, npflaredVersion));
		}
		cliSpinner.stop(`Successfully cloned npflared (v${npflaredVersion})`);

		const workerName = await promptWorkerName();

		const packageManager = await promptPackageManager();

		cliSpinner.start(`Installing dependencies using ${packageManager}...`);
		await $({ quiet: true, cwd: npflaredCurrentVersionDirectory })`npx -y ${packageManager} install`;
		cliSpinner.stop(`Successfully installed dependencies using ${packageManager}`);

		cliSpinner.start("Retrieving Cloudflare account id...");
		const cloudflareAccountId = await getLocalAccountId();
		cliSpinner.stop();

		if (!cloudflareAccountId) {
			log.error(
				chalk.red(`Could not retrieve Cloudflare account id, please login with ${chalk.bold.white("wrangler login")}`)
			);

			process.exit(1);
		} else {
			log.info(chalk.green(`Using cloudflare account id: ${chalk.bold.white(cloudflareAccountId)}`));
		}

		const d1Database = await promptD1Database();
		const r2Bucket = await promptR2Bucket();

		cliSpinner.start("Generating wrangler configuration...");
		const wranglerConfig = {
			name: workerName,
			main: "src/index.ts",
			compatibility_date: "2024-11-24",
			compatibility_flags: ["nodejs_compat"],
			d1_databases: [{ binding: "DB", database_name: d1Database.name, database_id: d1Database.id }],
			r2_buckets: [{ binding: "BUCKET", bucket_name: r2Bucket.name }]
		};
		const wranglerConfigFilePath = join(npflaredCurrentVersionDirectory, "wrangler.json");

		await writeFile(join(npflaredCurrentVersionDirectory, "wrangler.json"), JSON.stringify(wranglerConfig, null, 2));
		cliSpinner.stop(`Wrangler configuration generated at ${wranglerConfigFilePath}`);

		const adminToken = await generateAdminToken(npflaredCurrentVersionDirectory);

		cliSpinner.start("Applying D1 migrations...");
		await applyD1Migrations(d1Database.name, { cwd: npflaredCurrentVersionDirectory });
		cliSpinner.stop("Successfully applied D1 migrations");

		cliSpinner.start("Deploying...");
		const deployedUrl = await deploy({ cwd: npflaredCurrentVersionDirectory });
		cliSpinner.stop();

		log.info(
			chalk.green(dedent`
			🔥 npflared is now ready to use!
			🔗 Deployed to: ${chalk.bold.white(deployedUrl)}
			👮 Admin token: ${chalk.bold.white(adminToken)}
			📚 Check documentation for more information: ${chalk.bold.white("https://npflared.thomas-cogez.fr")}
		`)
		);

		outro(`You're all set!`);
	} catch (error) {
		log.error(`${error}`);
		process.exit(1);
	} finally {
		cleanup();
	}
};
