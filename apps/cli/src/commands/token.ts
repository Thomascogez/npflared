import { randomUUID } from "node:crypto";
import { intro, isCancel, log, outro, select, spinner, text } from "@clack/prompts";
import chalk from "chalk";
import { $ } from "zx";
import { encode as encodeBase32 } from "uuid-b32";
import type { Argv, CommandModule } from "yargs";
import { executeD1, getLocalAccountId } from "../utils/cloudflare";
import { cliContext } from "../utils/context";

const cliSpinner = spinner();

type TokenScopeType = "package:read" | "package:write" | "package:read+write";

type CreateTokenArgs = {
	package?: string;
	mode?: TokenScopeType;
	name?: string;
	local: boolean;
};

type ClearTokensArgs = {
	package?: string;
	local: boolean;
};

type RemoveTokenArgs = {
	token?: string;
	local: boolean;
};
const promptPackageName = async (): Promise<string> => {
	const pkg = await text({
		message: "Package name (e.g. @scope/pkg or pkg):",
		validate(value) {
			const v = value ?? "";
			if (!v.trim()) {
				return "Please enter a package name.";
			}
		}
	});

	if (isCancel(pkg)) {
		process.exit(1);
	}

	return pkg.trim();
};

const promptScopeMode = async (): Promise<TokenScopeType> => {
	const mode = await select({
		message: "Select token permissions for this package:",
		options: [
			{
				value: "package:read" as const,
				label: "Read only (install only)"
			},
			{
				value: "package:write" as const,
				label: "Write only (publish only)"
			},
			{
				value: "package:read+write" as const,
				label: "Read + write (install + publish)"
			}
		]
	});

	if (isCancel(mode)) {
		process.exit(1);
	}

	return mode;
};

const promptTokenName = async (pkgName: string): Promise<string> => {
	const name = await text({
		message: "Token label (for your own reference):",
		initialValue: `pkg-${pkgName}-token`,
		validate(value) {
			const v = value ?? "";
			if (!v.trim()) {
				return "Please enter a token label.";
			}
		}
	});

	if (isCancel(name)) {
		process.exit(1);
	}

	return name.trim();
};

const ensureCloudflareAccount = async (): Promise<string> => {
	cliSpinner.start("Retrieving Cloudflare account id...");
	const accountId = await getLocalAccountId();
	cliSpinner.stop();

	if (!accountId) {
		log.error(
			chalk.red(`Could not retrieve Cloudflare account id, please login with ${chalk.bold.white("wrangler login")}.`)
		);
		process.exit(1);
	}

	log.info(chalk.green(`Using Cloudflare account id: ${chalk.bold.white(accountId)}`));
	return accountId;
};

const buildScopesJson = (scopeType: TokenScopeType, pkgName: string): string =>
	JSON.stringify([
		{
			type: scopeType,
			values: [pkgName]
		}
	]);

const createToken = async (args: CreateTokenArgs) => {
	intro(`npflared token add (${args.local ? "local" : "remote"})`);

	// Even for local, this also sanity-checks Wrangler auth
	await ensureCloudflareAccount();

	const packageName = args.package ?? (await promptPackageName());
	const scopeType = args.mode ?? (await promptScopeMode());
	const tokenLabel = args.name ?? (await promptTokenName(packageName));

	const rawToken = randomUUID();
	const tokenValue = encodeBase32(rawToken).toLowerCase();
	const scopesJson = buildScopesJson(scopeType, packageName).replace(/'/g, "''");
	const nowSql = "strftime('%s','now')";

	const sql = `
    INSERT INTO token (token, name, scopes, created_at, updated_at)
    VALUES ('${tokenValue}', '${tokenLabel.replace(/'/g, "''")}', '${scopesJson}', ${nowSql}, ${nowSql});
  `;

	cliSpinner.start(`Creating token in ${args.local ? "local" : "remote"} D1...`);
	await executeD1(sql, { local: args.local });
	cliSpinner.stop("Token created.");

	log.info(
		chalk.green(
			[
				"",
				chalk.bold("New token created:"),
				`  Token:   ${chalk.bold.white(tokenValue)}`,
				`  Package: ${chalk.bold.white(packageName)}`,
				`  Mode:    ${chalk.bold.white(scopeType)}`,
				`  Target:  ${chalk.bold.white(args.local ? "local D1 (wrangler dev)" : "remote D1")}`,
				"",
				"Use it in .npmrc like:",
				`  @babadeluxe:registry=https://your-npflared-url`,
				`  //your-npflared-url/:_authToken=${tokenValue}`,
				""
			].join("\n")
		)
	);

	outro("Done.");
};

const clearTokensForPackage = async (args: ClearTokensArgs) => {
	intro(`npflared token clear (${args.local ? "local" : "remote"})`);

	await ensureCloudflareAccount();

	const packageName = args.package ?? (await promptPackageName());
	const escapedPkg = packageName.replace(/'/g, "''");

	const sql = `
    DELETE FROM token
    WHERE json_extract(scopes, '$[*].values') LIKE '%${escapedPkg}%';
  `;

	cliSpinner.start(`Deleting all tokens for package ${packageName} (${args.local ? "local" : "remote"})...`);
	await executeD1(sql, { local: args.local });
	cliSpinner.stop("Tokens deleted.");

	outro("Done.");
};

const removeTokenByValue = async (args: RemoveTokenArgs) => {
	intro(`npflared token remove (${args.local ? "local" : "remote"})`);

	await ensureCloudflareAccount();

	const tokenValueArg = args.token;
	const tokenValue =
		tokenValueArg ??
		(await text({
			message: "Token value to delete:",
			validate(value) {
				const v = value ?? "";
				if (!v.trim()) {
					return "Please enter a token value.";
				}
			}
		}).then((val) => {
			if (isCancel(val)) {
				process.exit(1);
			}
			return val.trim();
		}));

	const escapedToken = tokenValue?.replace(/'/g, "''");

	const sql = `
    DELETE FROM token
    WHERE token = '${escapedToken}';
  `;

	cliSpinner.start(`Deleting token ${tokenValue} (${args.local ? "local" : "remote"})...`);
	await executeD1(sql, { local: args.local });
	cliSpinner.stop("Token deleted.");

	outro("Done.");
};

export const tokenCommands: CommandModule = {
	command: "token <sub>",
	describe: "Manage npflared tokens (per-package read/write permissions)",
	builder: (yargs: Argv) =>
		yargs
			.command(
				"add",
				"Create a new token scoped to a specific package",
				(yy) =>
					yy
						.option("package", {
							alias: "p",
							type: "string",
							describe: "Package name (e.g. @scope/pkg)"
						})
						.option("mode", {
							alias: "m",
							choices: ["package:read", "package:write", "package:read+write"] as const,
							describe: "Token permission mode for this package"
						})
						.option("name", {
							alias: "n",
							type: "string",
							describe: "Label/name for this token"
						})
						.option("local", {
							alias: "l",
							type: "boolean",
							default: false,
							describe: "Operate on local D1 instead of remote (for wrangler dev)"
						}),
				async (argv) => {
					await cliContext.run(
						{
							packageManagerAgent: "npm"
						},
						async () => {
							await createToken({
								package: argv.package as string | undefined,
								mode: argv.mode as TokenScopeType | undefined,
								name: argv.name as string | undefined,
								local: Boolean(argv.local)
							});
						}
					);
				}
			)
			.command(
				"clear",
				"Delete all tokens that grant access to a given package",
				(yy) =>
					yy
						.option("package", {
							alias: "p",
							type: "string",
							describe: "Package name (e.g. @scope/pkg)"
						})
						.option("local", {
							alias: "l",
							type: "boolean",
							default: false,
							describe: "Operate on local D1 instead of remote (for wrangler dev)"
						}),
				async (argv) => {
					await cliContext.run(
						{
							packageManagerAgent: "npm"
						},
						async () => {
							await clearTokensForPackage({
								package: argv.package as string | undefined,
								local: Boolean(argv.local)
							});
						}
					);
				}
			)
			.command(
				"remove",
				"Delete a single token by its value",
				(yy) =>
					yy
						.option("token", {
							alias: "t",
							type: "string",
							describe: "Token value to delete"
						})
						.option("local", {
							alias: "l",
							type: "boolean",
							default: false,
							describe: "Operate on local D1 instead of remote (for wrangler dev)"
						}),
				async (argv) => {
					await cliContext.run(
						{
							packageManagerAgent: "npm"
						},
						async () => {
							await removeTokenByValue({
								token: argv.token as string | undefined,
								local: Boolean(argv.local)
							});
						}
					);
				}
			)
			.demandCommand(1),
	handler: () => {
		// subcommands handle everything
	}
};
