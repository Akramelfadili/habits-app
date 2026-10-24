ALTER TABLE `categories` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- HAB-42 / T-16: Health and Social move off red. Must match BUILT_IN_CATEGORIES
-- in modules/habits/constants.ts — a test checks it.
UPDATE `categories` SET `hue` = 175 WHERE `built_in` = 1 AND `name` = 'Health';--> statement-breakpoint
UPDATE `categories` SET `hue` = 230 WHERE `built_in` = 1 AND `name` = 'Social';--> statement-breakpoint
-- The custom rotation drops 15 and 350 (red) and 175 and 230 (now Health's and
-- Social's), leaving six slots: 0 ring/330, 1 square/95, 2 bars/220,
-- 3 plus/265, 4 half/130, 5 archive/290 (CATEGORY_ROTATION; a test checks it).
-- A custom on a dropped hue moves to a whole new slot (shape and hue), one at a
-- time in id order, each taking the slot `nextCategoryAppearance` would pick:
-- fewest customs already on it, ties to the lowest slot. `pick` row n holds the
-- per-slot counts after n moves; mover n + 1 takes the slot with the fewest.
-- Assignments go through a temp table so the UPDATE below never reads rows it
-- has already changed.
CREATE TEMP TABLE `__category_remap` (`id` integer PRIMARY KEY, `slot` integer NOT NULL);--> statement-breakpoint
INSERT INTO `__category_remap` (`id`, `slot`)
WITH RECURSIVE
	`movers` AS (
		SELECT `id`, row_number() OVER (ORDER BY `id`) AS `n`
		FROM `categories`
		WHERE `built_in` = 0 AND `hue` IN (175, 230, 15, 350)
	),
	`pick` (`n`, `c0`, `c1`, `c2`, `c3`, `c4`, `c5`) AS (
		SELECT 0,
			coalesce(sum(`shape` = 'ring' AND `hue` = 330), 0),
			coalesce(sum(`shape` = 'square' AND `hue` = 95), 0),
			coalesce(sum(`shape` = 'bars' AND `hue` = 220), 0),
			coalesce(sum(`shape` = 'plus' AND `hue` = 265), 0),
			coalesce(sum(`shape` = 'half' AND `hue` = 130), 0),
			coalesce(sum(`shape` = 'archive' AND `hue` = 290), 0)
		FROM `categories`
		WHERE `built_in` = 0 AND `hue` NOT IN (175, 230, 15, 350)
		UNION ALL
		SELECT `n` + 1,
			`c0` + (min(`c0`, `c1`, `c2`, `c3`, `c4`, `c5`) = `c0`),
			`c1` + (min(`c0`, `c1`, `c2`, `c3`, `c4`, `c5`) = `c1` AND `c0` > `c1`),
			`c2` + (min(`c0`, `c1`, `c2`, `c3`, `c4`, `c5`) = `c2` AND min(`c0`, `c1`) > `c2`),
			`c3` + (min(`c0`, `c1`, `c2`, `c3`, `c4`, `c5`) = `c3` AND min(`c0`, `c1`, `c2`) > `c3`),
			`c4` + (min(`c0`, `c1`, `c2`, `c3`, `c4`, `c5`) = `c4` AND min(`c0`, `c1`, `c2`, `c3`) > `c4`),
			`c5` + (min(`c0`, `c1`, `c2`, `c3`, `c4`, `c5`) = `c5` AND min(`c0`, `c1`, `c2`, `c3`, `c4`) > `c5`)
		FROM `pick`
		WHERE `n` < (SELECT count(*) FROM `movers`)
	)
SELECT `movers`.`id`,
	CASE min(`c0`, `c1`, `c2`, `c3`, `c4`, `c5`) WHEN `c0` THEN 0 WHEN `c1` THEN 1 WHEN `c2` THEN 2 WHEN `c3` THEN 3 WHEN `c4` THEN 4 ELSE 5 END
FROM `movers` JOIN `pick` ON `pick`.`n` = `movers`.`n` - 1;--> statement-breakpoint
UPDATE `categories`
SET
	`shape` = CASE (SELECT `slot` FROM `__category_remap` WHERE `__category_remap`.`id` = `categories`.`id`) WHEN 0 THEN 'ring' WHEN 1 THEN 'square' WHEN 2 THEN 'bars' WHEN 3 THEN 'plus' WHEN 4 THEN 'half' ELSE 'archive' END,
	`hue` = CASE (SELECT `slot` FROM `__category_remap` WHERE `__category_remap`.`id` = `categories`.`id`) WHEN 0 THEN 330 WHEN 1 THEN 95 WHEN 2 THEN 220 WHEN 3 THEN 265 WHEN 4 THEN 130 ELSE 290 END
WHERE `id` IN (SELECT `id` FROM `__category_remap`);--> statement-breakpoint
DROP TABLE `__category_remap`;--> statement-breakpoint
-- HAB-42 backfill: the stored group order reproduces the order Today and
-- Manage derived before V3: first appearance among active habits in manual
-- order (sort_order, then id), then categories only archived habits use (same
-- rule), then unused ones by id; Other always last. Habits whose category_id
-- dangles (foreign keys are off on device) are ignored. 1-based, gap-free.
UPDATE `categories`
SET `sort_order` = (
	SELECT `rank` FROM (
		SELECT `c`.`id`,
			row_number() OVER (
				ORDER BY
					(`c`.`built_in` = 1 AND `c`.`name` = 'Other'),
					`active`.`first` IS NULL, `active`.`first`,
					`archived`.`first` IS NULL, `archived`.`first`,
					`c`.`id`
			) AS `rank`
		FROM `categories` AS `c`
		LEFT JOIN (
			SELECT `category_id`, min(`position`) AS `first`
			FROM (
				SELECT `category_id`, row_number() OVER (ORDER BY `sort_order`, `id`) AS `position`
				FROM `habits` WHERE `archived_at` IS NULL
			)
			GROUP BY `category_id`
		) AS `active` ON `active`.`category_id` = `c`.`id`
		LEFT JOIN (
			SELECT `category_id`, min(`position`) AS `first`
			FROM (
				SELECT `category_id`, row_number() OVER (ORDER BY `sort_order`, `id`) AS `position`
				FROM `habits` WHERE `archived_at` IS NOT NULL
			)
			GROUP BY `category_id`
		) AS `archived` ON `archived`.`category_id` = `c`.`id`
	) AS `ranked`
	WHERE `ranked`.`id` = `categories`.`id`
);
