CREATE TABLE `habits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`category` text,
	`direction` text DEFAULT 'build' NOT NULL,
	`target_type` text DEFAULT 'simple' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
