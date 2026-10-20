PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_token` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text,
	`legacy_token` text,
	`name` text NOT NULL,
	`scopes` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_token`("id", "legacy_token", "name", "scopes", "created_at", "updated_at") SELECT
	lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
	"token", "name", "scopes", "created_at", "updated_at" FROM `token`;--> statement-breakpoint
DROP TABLE `token`;--> statement-breakpoint
ALTER TABLE `__new_token` RENAME TO `token`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `token_token_hash_unique` ON `token` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `token_legacy_token_unique` ON `token` (`legacy_token`);
