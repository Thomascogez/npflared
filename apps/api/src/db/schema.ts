import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tokenTable = sqliteTable("token", {
	token: text("token").primaryKey().notNull(),
	name: text("name").notNull(),
	scopes: text("scopes", { mode: "json" }).notNull().$type<Array<{ type: string; values: Array<string> }>>(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull()
});

export const packageTable = sqliteTable("package", {
	name: text("name").primaryKey().notNull(),
	distTags: text("dist_tags", { mode: "json" }).notNull().$type<Record<string, string>>(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull()
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
		createdAt: integer("created_at").notNull()
	},
	(table) => [primaryKey({ columns: [table.package, table.version] })]
);
