import type { tokenTable } from "#db/schema";

export const assertTokenAccess = (token: typeof tokenTable.$inferSelect | undefined) => {
	return (operation: "read" | "write", entity: "user" | "package" | "token", targetedPackage: string) => {
		if (!token) {
			return false;
		}

		const targetedScopesValue = (token.scopes ?? [])
			.filter(({ type }) => {
				const allowsRead = type === "package:read" || type === "package:read+write";
				const allowsWrite = type === "package:write" || type === "package:read+write";

				if (entity === "package") {
					return (operation === "read" && allowsRead) || (operation === "write" && allowsWrite);
				}

				return type.startsWith(`${entity}:`) && type.includes(operation);
			})
			.flatMap(({ values }) => values);

		return targetedScopesValue.some((value) => value === "*" || value === targetedPackage);
	};
};
