import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "#db/index";
import { tokenTable } from "#db/schema";
import type { validators } from "#routers/token/validators";
import { generateToken, hashToken } from "#utils/token";

/** Token fields that are safe to expose: never the hash nor a legacy plaintext value. */
const publicTokenColumns = {
	id: true,
	name: true,
	scopes: true,
	createdAt: true,
	updatedAt: true
} as const;

export type PublicToken = Pick<typeof tokenTable.$inferSelect, keyof typeof publicTokenColumns>;

const toPublicToken = ({ id, name, scopes, createdAt, updatedAt }: typeof tokenTable.$inferSelect): PublicToken => ({
	id,
	name,
	scopes,
	createdAt,
	updatedAt
});

export const tokenService = {
	/**
	 * Creates a token and returns it along with its plaintext value.
	 * The plaintext is only available here: only its hash is persisted.
	 */
	async createToken(tokenData: z.infer<typeof validators.post.request.json>) {
		const now = Date.now();
		const token = generateToken();

		const [createdToken] = await db
			.insert(tokenTable)
			.values({
				id: crypto.randomUUID(),
				tokenHash: await hashToken(token),
				name: tokenData.name,
				scopes: tokenData.scopes,
				createdAt: now,
				updatedAt: now
			})
			.returning();

		if (!createdToken) {
			return undefined;
		}

		return { ...toPublicToken(createdToken), token };
	},

	async listTokens(): Promise<PublicToken[]> {
		return db.query.tokenTable.findMany({ columns: publicTokenColumns });
	},

	async getToken(id: string): Promise<PublicToken | undefined> {
		return db.query.tokenTable.findFirst({
			columns: publicTokenColumns,
			where: (table, { eq }) => eq(table.id, id)
		});
	},

	/** Deletes a token by id. Returns `false` when no token has that id. */
	async deleteToken(id: string) {
		const deleted = await db.delete(tokenTable).where(eq(tokenTable.id, id)).returning({ id: tokenTable.id });
		return deleted.length > 0;
	},

	/**
	 * Resolves the token matching a plaintext credential, or `undefined`.
	 * Tokens created before hashing was introduced are matched on their stored
	 * plaintext and upgraded in place: the hash is stored and the plaintext cleared.
	 */
	async authenticate(token: string): Promise<PublicToken | undefined> {
		const tokenHash = await hashToken(token);

		const hashedToken = await db.query.tokenTable.findFirst({
			columns: publicTokenColumns,
			where: (table, { eq }) => eq(table.tokenHash, tokenHash)
		});

		if (hashedToken) {
			return hashedToken;
		}

		const legacyToken = await db.query.tokenTable.findFirst({
			columns: publicTokenColumns,
			where: (table, { eq }) => eq(table.legacyToken, token)
		});

		if (!legacyToken) {
			return undefined;
		}

		await db.update(tokenTable).set({ tokenHash, legacyToken: null }).where(eq(tokenTable.id, legacyToken.id));

		return legacyToken;
	}
};
