import { access } from "node:fs/promises";

export const pathExists = async (path: string) => {
	try {
		await access(path);
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
			return false;
		}

		throw error;
	}
};
