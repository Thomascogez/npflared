import type { tokenTable } from "#db/schema";

export const assertTokenAccess = (token: typeof tokenTable.$inferSelect) => {
	return (operation: "read" | "write", entity: "user" | "package" | "token", targetedPackage: string) => {
		const targetedScopesValue = (token?.scopes ?? [])
			.filter(({ type }) => type.startsWith(`${entity}:`) && type.includes(operation))
			.flatMap(({ values }) => values);

		return targetedScopesValue.some((value) => value === "*" || value === targetedPackage);
	};
};
