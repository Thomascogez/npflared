import { rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { intro, spinner } from "@clack/prompts";

const cliSpinner = spinner();

const npflaredDirName = ".npflared";
const npflaredDirPath = join(homedir(), npflaredDirName);

export const clean = async () => {
	intro("npflared");

	cliSpinner.start(`Deleting npflared directory (${npflaredDirPath})...`);
	await rm(npflaredDirPath, { recursive: true, force: true });
	cliSpinner.stop("Successfully deleted npflared directory");

	process.exit(0);
};
