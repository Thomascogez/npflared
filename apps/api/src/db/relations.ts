import { relations } from "drizzle-orm";
import { packageReleaseTable, packageTable } from "./schema";

export const packageTableRelations = relations(packageTable, ({ many }) => ({
	packageReleases: many(packageReleaseTable)
}));

export const packageReleaseTableRelations = relations(packageReleaseTable, ({ one }) => ({
	package: one(packageTable, {
		fields: [packageReleaseTable.package],
		references: [packageTable.name]
	})
}));
