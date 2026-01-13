#!/usr/bin/env node

import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import { clean } from "./commands/clean";
import { install } from "./commands/install";

yargs(hideBin(process.argv))
	.command(
		"install",
		"Configure and deploy your own npflared instance on your cloudflare account",
		(yargs) => yargs,
		async () => {
			await install();
		}
	)
	.command(
		"clean",
		"Clean the local npflared folder",
		(yargs) => yargs,
		async () => {
			await clean();
		}
	)
	.demandCommand(1)
	.parse();
