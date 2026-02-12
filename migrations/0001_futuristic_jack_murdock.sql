CREATE TABLE `oauth_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`provider_id` text NOT NULL,
	`display_name` text,
	`avatar_url` text,
	`email` text,
	`linked_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_oauth_accounts_user_id` ON `oauth_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_oauth_accounts_provider` ON `oauth_accounts` (`provider`,`provider_id`);--> statement-breakpoint
DROP INDEX `idx_users_provider`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `auth_provider`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `provider_id`;