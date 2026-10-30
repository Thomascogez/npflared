/**
 * Hashes tokens that were stored in plaintext before token hashing was introduced.
 *
 * Legacy tokens are also upgraded automatically the first time they are used, so this
 * script is only needed to upgrade the ones that have not been used since.
 *
 * Usage: node scripts/migrate-legacy-tokens.mjs [--remote]
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const remote = process.argv.includes("--remote");

const d1Execute = (command) => {
	const args = ["wrangler", "d1", "execute", "DB", "--json", "--command", command];
	if (remote) {
		args.push("--remote");
	}

	const result = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", args, { encoding: "utf8" });

	if (result.status !== 0) {
		throw new Error(result.stderr || result.stdout);
	}

	return JSON.parse(result.stdout);
};

const quoteSql = (value) => value.replace(/'/g, "''");

const [{ results: legacyTokens }] = d1Execute(
	"SELECT id, legacy_token AS legacyToken FROM token WHERE legacy_token IS NOT NULL"
);

if (legacyTokens.length === 0) {
	console.log("No legacy plaintext tokens found, nothing to migrate.");
	process.exit(0);
}

const statements = legacyTokens.map(({ id, legacyToken }) => {
	const tokenHash = createHash("sha256").update(legacyToken).digest("hex");
	return `UPDATE token SET token_hash = '${tokenHash}', legacy_token = NULL WHERE id = '${quoteSql(id)}' AND legacy_token IS NOT NULL`;
});

d1Execute(statements.join("; "));

console.log(
	`Migrated ${legacyTokens.length} legacy token(s) to hashed storage (${remote ? "remote" : "local"} database).`
);
