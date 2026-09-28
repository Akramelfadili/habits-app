CREATE TABLE `frozen_days` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`habit_id` integer NOT NULL,
	`date` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `frozen_days_date_idx` ON `frozen_days` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `frozen_days_habit_date_unique` ON `frozen_days` (`habit_id`,`date`);