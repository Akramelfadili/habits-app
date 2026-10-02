-- HAB-24: rebuild `habits` so `category_id` is NOT NULL (SQLite can't add NOT NULL
-- in place). Hand-reordered from drizzle-kit's generated rebuild, which was:
--   PRAGMA foreign_keys=OFF; CREATE __new_habits; INSERT … SELECT FROM habits;
--   DROP habits; ALTER __new_habits RENAME TO habits; PRAGMA foreign_keys=ON;
-- Drizzle's migrator runs every pending migration inside one BEGIN…COMMIT, where
-- `PRAGMA foreign_keys` is a no-op — so with FK enforcement on, that DROP fails
-- (entries/entry_notes/frozen_days/reminders still reference every habit; none
-- cascade). Instead: defer FK checks (this pragma *does* work in a transaction
-- and resets at COMMIT), park the rows, drop, recreate `habits` under its real
-- name, and insert the rows back — re-inserting each referenced parent row is
-- what clears the drop's deferred violations, so COMMIT succeeds and no child
-- row is touched. Ids are copied verbatim, so every child still points at the
-- same habit. With FK enforcement off (expo-sqlite's default) it's a plain copy.
-- `habits` has no indexes, UNIQUE constraints or triggers to recreate (a test
-- checks sqlite_master is identical before and after).
PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__old_habits` AS SELECT * FROM `habits`;--> statement-breakpoint
-- DROP also discards the AUTOINCREMENT high-water mark; park it, so ids of
-- habits deleted before this migration are never handed out again.
CREATE TABLE `__old_habits_seq` AS SELECT `seq` FROM `sqlite_sequence` WHERE `name` = 'habits';--> statement-breakpoint
DROP TABLE `habits`;--> statement-breakpoint
CREATE TABLE `habits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`color` text,
	`category` text,
	`category_id` integer NOT NULL,
	`direction` text DEFAULT 'build' NOT NULL,
	`target_type` text DEFAULT 'simple' NOT NULL,
	`target_amount` integer,
	`target_unit` text,
	`frequency_type` text DEFAULT 'daily' NOT NULL,
	`frequency_weekdays` text,
	`frequency_times_per_week` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`paused_ranges` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `habits`("id", "name", "icon", "color", "category", "category_id", "direction", "target_type", "target_amount", "target_unit", "frequency_type", "frequency_weekdays", "frequency_times_per_week", "sort_order", "archived_at", "paused_ranges", "created_at", "updated_at") SELECT "id", "name", "icon", "color", "category", "category_id", "direction", "target_type", "target_amount", "target_unit", "frequency_type", "frequency_weekdays", "frequency_times_per_week", "sort_order", "archived_at", "paused_ranges", "created_at", "updated_at" FROM `__old_habits`;--> statement-breakpoint
DROP TABLE `__old_habits`;--> statement-breakpoint
DELETE FROM `sqlite_sequence` WHERE `name` = 'habits' AND `seq` < (SELECT max(`seq`) FROM `__old_habits_seq`);--> statement-breakpoint
INSERT INTO `sqlite_sequence` (`name`, `seq`) SELECT 'habits', `seq` FROM `__old_habits_seq` WHERE NOT EXISTS (SELECT 1 FROM `sqlite_sequence` WHERE `name` = 'habits');--> statement-breakpoint
DROP TABLE `__old_habits_seq`;
