import { z } from "zod";

export const validators = {
	me: {
		response: {
			200: z.object({
				provider: z.string(),
				subject: z.string(),
				email: z.string().optional()
			})
		}
	}
};
