import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "#db/index";
import { tokenTable } from "#db/schema";
import type { postTokenValidators } from "#routers/token/validators";

export const tokenService = {
	async createToken(tokenData: z.infer<typeof postTokenValidators.json>) {
		const now = Date.now();

		const insertQueryResult = await db
			.insert(tokenTable)
			.values({
				name: tokenData.name,
				token: crypto.randomUUID(),
				scopes: tokenData.scopes,
				createdAt: now,
				updatedAt: now
			})
			.returning();

		const [token] = insertQueryResult;

		return token;
	},

	async listTokens() {
		const tokens = await db.query.tokenTable.findMany();
		return tokens;
	},

	async getToken(token: string) {
		const targetedToken = await db.query.tokenTable.findFirst({
			where: (table, { eq }) => eq(table.token, token)
		});

		return targetedToken;
	},

	async deleteToken(token: string) {
		await db.delete(tokenTable).where(eq(tokenTable.token, token));
	}
};
