ALTER TABLE `habits` ADD `frequency_type` text DEFAULT 'daily' NOT NULL;--> statement-breakpoint
ALTER TABLE `habits` ADD `frequency_weekdays` text;--> statement-breakpoint
ALTER TABLE `habits` ADD `frequency_times_per_week` integer;