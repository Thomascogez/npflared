import { AsyncLocalStorage } from "node:async_hooks";
import type { AGENTS } from "@antfu/ni";

export const cliContext = new AsyncLocalStorage<{ packageManagerAgent: (typeof AGENTS)[number] }>();
