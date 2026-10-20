import type { PublicToken } from "#services/token-service";

export const assertTokenAccess = (token: PublicToken | undefined) => {
	return (operation: "read" | "write", entity: "user" | "package" | "token", target: string) => {
		const targetedScopesValue = (token?.scopes ?? [])
			.filter(({ type }) => type.startsWith(`${entity}:`) && type.includes(operation))
			.flatMap(({ values }) => values);

		return targetedScopesValue.some((value) => value === "*" || value === target);
	};
};
