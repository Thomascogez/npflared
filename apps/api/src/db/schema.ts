import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const unixEpochMs = sql`(unixepoch('subsec') * 1000)`;

export const tokenTable = sqliteTable("token", {
	id: text("id").primaryKey().notNull(),
	/** SHA-256 hex digest of the plaintext token. The plaintext itself is never stored. */
	tokenHash: text("token_hash").unique(),
	/**
	 * Plaintext token of rows created before hashing was introduced.
	 * Cleared (and `tokenHash` filled in) the first time the token is used.
	 */
	legacyToken: text("legacy_token").unique(),
	name: text("name").notNull(),
	scopes: text("scopes", { mode: "json" }).notNull().$type<Array<{ type: string; values: Array<string> }>>(),
	createdAt: integer("created_at").notNull().default(unixEpochMs),
	updatedAt: integer("updated_at").notNull().default(unixEpochMs)
});

export const packageTable = sqliteTable("package", {
	name: text("name").primaryKey().notNull(),
	distTags: text("dist_tags", { mode: "json" }).notNull().$type<Record<string, string>>(),
	createdAt: integer("created_at").notNull().default(unixEpochMs),
	updatedAt: integer("updated_at").notNull().default(unixEpochMs)
});

export const packageReleaseTable = sqliteTable(
	"package_release",
	{
		package: text("package")
			.references(() => packageTable.name)
			.notNull(),
		version: text("version").notNull(),
		tag: text("tag").notNull(),
		manifest: text("manifest", { mode: "json" }).notNull(),
		createdAt: integer("created_at").notNull().default(unixEpochMs)
	},
	(table) => [primaryKey({ columns: [table.package, table.version] })]
);
