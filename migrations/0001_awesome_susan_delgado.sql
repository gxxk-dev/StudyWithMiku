DROP INDEX `idx_oauth_accounts_provider`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_oauth_accounts_provider` ON `oauth_accounts` (`provider`,`provider_id`);