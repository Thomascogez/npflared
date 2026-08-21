PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_package_release` (
	`package` text NOT NULL,
	`version` text NOT NULL,
	`tag` text NOT NULL,
	`manifest` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	PRIMARY KEY(`package`, `version`),
	FOREIGN KEY (`package`) REFERENCES `package`(`name`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_package_release`("package", "version", "tag", "manifest", "created_at") SELECT "package", "version", "tag", "manifest", "created_at" FROM `package_release`;--> statement-breakpoint
DROP TABLE `package_release`;--> statement-breakpoint
ALTER TABLE `__new_package_release` RENAME TO `package_release`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_package` (
	`name` text PRIMARY KEY NOT NULL,
	`dist_tags` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_package`("name", "dist_tags", "created_at", "updated_at") SELECT "name", "dist_tags", "created_at", "updated_at" FROM `package`;--> statement-breakpoint
DROP TABLE `package`;--> statement-breakpoint
ALTER TABLE `__new_package` RENAME TO `package`;--> statement-breakpoint
CREATE TABLE `__new_token` (
	`token` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`scopes` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_token`("token", "name", "scopes", "created_at", "updated_at") SELECT "token", "name", "scopes", "created_at", "updated_at" FROM `token`;--> statement-breakpoint
DROP TABLE `token`;--> statement-breakpoint
ALTER TABLE `__new_token` RENAME TO `token`;