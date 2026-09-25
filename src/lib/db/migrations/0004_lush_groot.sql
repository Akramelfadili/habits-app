ALTER TABLE `entries` ADD `value` integer;--> statement-breakpoint
ALTER TABLE `habits` ADD `target_amount` integer;--> statement-breakpoint
ALTER TABLE `habits` ADD `target_unit` text;--> statement-breakpoint
-- Quantity habits created before HAB-07 never had a real target (the Amount/Unit
-- fields didn't exist yet), so `target_amount` is null for them at this point.
-- Give them a floor target of 1 so the "quantity habit always has a non-null
-- target" invariant holds from here on — editable to a real value at any time.
UPDATE `habits` SET `target_amount` = 1 WHERE `target_type` = 'quantity' AND `target_amount` IS NULL;--> statement-breakpoint
UPDATE `habits` SET `target_unit` = 'time' WHERE `target_type` = 'quantity' AND `target_unit` IS NULL;--> statement-breakpoint
-- Backfill existing entries for quantity habits to their habit's target, so a day
-- that was already checked off (back when quantity habits rendered as a plain
-- checkbox, pre-HAB-07) doesn't retroactively read as incomplete now that
-- completion means value >= target_amount.
UPDATE `entries` SET `value` = (SELECT `target_amount` FROM `habits` WHERE `habits`.`id` = `entries`.`habit_id`) WHERE `habit_id` IN (SELECT `id` FROM `habits` WHERE `target_type` = 'quantity');