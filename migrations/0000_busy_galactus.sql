CREATE TABLE `credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`public_key` blob NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`transports` text,
	`device_type` text,
	`device_name` text,
	`backed_up` integer DEFAULT 0 NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_credentials_user_id` ON `credentials` (`user_id`);--> statement-breakpoint
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
CREATE TABLE `token_blacklist` (
	`jti` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_token_blacklist_expires` ON `token_blacklist` (`expires_at`);--> statement-breakpoint
CREATE TABLE `user_data` (
	`user_id` text NOT NULL,
	`data_type` text NOT NULL,
	`data` blob NOT NULL,
	`data_format` text DEFAULT 'cbor' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`user_id`, `data_type`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text,
	`avatar_url` text,
	`email` text,
	`qq_number` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `idx_users_username` ON `users` (`username`);