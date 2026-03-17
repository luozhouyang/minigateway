CREATE TABLE `consumers` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text,
	`custom_id` text,
	`tags` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `consumers_username_unique` ON `consumers` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `consumers_custom_id_unique` ON `consumers` (`custom_id`);--> statement-breakpoint
CREATE TABLE `credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`consumer_id` text,
	`credential_type` text NOT NULL,
	`credential` text NOT NULL,
	`tags` text,
	`created_at` text,
	FOREIGN KEY (`consumer_id`) REFERENCES `consumers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_credentials_consumer_id` ON `credentials` (`consumer_id`);--> statement-breakpoint
CREATE TABLE `plugins` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`service_id` text,
	`route_id` text,
	`consumer_id` text,
	`config` text,
	`enabled` integer DEFAULT true,
	`run_on` text DEFAULT 'first',
	`ordering` text,
	`tags` text,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`consumer_id`) REFERENCES `consumers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_plugins_service_id` ON `plugins` (`service_id`);--> statement-breakpoint
CREATE INDEX `idx_plugins_route_id` ON `plugins` (`route_id`);--> statement-breakpoint
CREATE INDEX `idx_plugins_consumer_id` ON `plugins` (`consumer_id`);--> statement-breakpoint
CREATE TABLE `routes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`service_id` text,
	`protocols` text,
	`methods` text,
	`hosts` text,
	`paths` text,
	`headers` text,
	`snis` text,
	`sources` text,
	`destinations` text,
	`strip_path` integer DEFAULT false,
	`preserve_host` integer DEFAULT false,
	`regex_priority` integer DEFAULT 0,
	`path_handling` text DEFAULT 'v0',
	`tags` text,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `routes_name_unique` ON `routes` (`name`);--> statement-breakpoint
CREATE INDEX `idx_routes_service_id` ON `routes` (`service_id`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text,
	`protocol` text DEFAULT 'http',
	`host` text,
	`port` integer,
	`path` text,
	`connect_timeout` integer DEFAULT 60000,
	`write_timeout` integer DEFAULT 60000,
	`read_timeout` integer DEFAULT 60000,
	`retries` integer DEFAULT 5,
	`tags` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `services_name_unique` ON `services` (`name`);--> statement-breakpoint
CREATE TABLE `targets` (
	`id` text PRIMARY KEY NOT NULL,
	`upstream_id` text,
	`target` text NOT NULL,
	`weight` integer DEFAULT 100,
	`tags` text,
	`created_at` text,
	FOREIGN KEY (`upstream_id`) REFERENCES `upstreams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_targets_upstream_id` ON `targets` (`upstream_id`);--> statement-breakpoint
CREATE TABLE `upstreams` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`algorithm` text DEFAULT 'round-robin',
	`hash_on` text DEFAULT 'none',
	`hash_fallback` text DEFAULT 'none',
	`slots` integer DEFAULT 10000,
	`healthcheck` text,
	`tags` text,
	`created_at` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `upstreams_name_unique` ON `upstreams` (`name`);