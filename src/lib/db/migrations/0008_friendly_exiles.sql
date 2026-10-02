ALTER TABLE `habits` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `habits` ADD `archived_at` integer;--> statement-breakpoint
ALTER TABLE `habits` ADD `paused_ranges` text;--> statement-breakpoint
-- Existing habits keep their creation order (ids are assigned in creation order).
UPDATE `habits` SET `sort_order` = `id`;