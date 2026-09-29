CREATE TABLE `household` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_name` text DEFAULT 'Li' NOT NULL,
	`partner_name` text DEFAULT 'Partner' NOT NULL,
	`partner_email` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`place_id` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_photos_place_id` ON `photos` (`place_id`);--> statement-breakpoint
CREATE TABLE `places` (
	`id` text PRIMARY KEY NOT NULL,
	`country` text NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`month` text DEFAULT '' NOT NULL,
	`traveler` text NOT NULL,
	`status` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_places_updated_at` ON `places` (`updated_at`);