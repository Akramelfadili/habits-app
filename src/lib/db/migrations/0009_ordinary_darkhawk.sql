CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`shape` text NOT NULL,
	`hue` integer,
	`built_in` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `habits` ADD `category_id` integer REFERENCES categories(id);--> statement-breakpoint
-- HAB-24 backfill: V1's free-text `category` → the managed set.
-- Built-ins first, in their fixed order (autoincrement ids carry that order).
-- Must match BUILT_IN_CATEGORIES in modules/habits/constants.ts — a test checks it.
INSERT INTO `categories` (`name`, `shape`, `hue`, `built_in`, `created_at`) VALUES
	('Health', 'plus', 25, 1, CAST(strftime('%s', 'now') AS INTEGER)),
	('Fitness', 'bars', 150, 1, CAST(strftime('%s', 'now') AS INTEGER)),
	('Mindfulness', 'diamond', 300, 1, CAST(strftime('%s', 'now') AS INTEGER)),
	('Productivity', 'square', 255, 1, CAST(strftime('%s', 'now') AS INTEGER)),
	('Learning', 'lines', 75, 1, CAST(strftime('%s', 'now') AS INTEGER)),
	('Finance', 'grid', 110, 1, CAST(strftime('%s', 'now') AS INTEGER)),
	('Social', 'half', 345, 1, CAST(strftime('%s', 'now') AS INTEGER)),
	('Home', 'archive', 45, 1, CAST(strftime('%s', 'now') AS INTEGER)),
	('Creativity', 'dot', 200, 1, CAST(strftime('%s', 'now') AS INTEGER)),
	('Other', 'ring', NULL, 1, CAST(strftime('%s', 'now') AS INTEGER));
--> statement-breakpoint
-- Every other distinct V1 string becomes a custom category: trimmed, cut to the
-- 20-character limit and re-trimmed, then deduped case-insensitively (so two
-- names sharing a 20-char prefix collapse into one), keeping the casing of the
-- habit that used it first. Blank and "Anytime" (V1's no-category label) are
-- not categories — those habits go to Other below. Rotation slots are handed
-- out in first-seen order, the same order `nextCategoryAppearance` would pick
-- them creating one at a time (fewest uses, ties lowest slot).
-- lower() is ASCII-only, so accent-case variants of custom names ("Écrire"/"écrire") are not merged.
INSERT INTO `categories` (`name`, `shape`, `hue`, `built_in`, `created_at`)
SELECT `name`, CASE `slot` WHEN 0 THEN 'diamond' WHEN 1 THEN 'ring' WHEN 2 THEN 'square' WHEN 3 THEN 'bars' WHEN 4 THEN 'dot' WHEN 5 THEN 'plus' WHEN 6 THEN 'half' WHEN 7 THEN 'lines' WHEN 8 THEN 'grid' WHEN 9 THEN 'archive' END, CASE `slot` WHEN 0 THEN 175 WHEN 1 THEN 330 WHEN 2 THEN 95 WHEN 3 THEN 220 WHEN 4 THEN 15 WHEN 5 THEN 265 WHEN 6 THEN 130 WHEN 7 THEN 350 WHEN 8 THEN 230 WHEN 9 THEN 290 END, 0, CAST(strftime('%s', 'now') AS INTEGER)
FROM (
	SELECT `name`, `first_id`, (row_number() OVER (ORDER BY `first_id`) - 1) % 10 AS `slot`
	FROM (
		SELECT trim(substr(trim(`category`, ' ' || char(9) || char(10) || char(13)), 1, 20), ' ' || char(9) || char(10) || char(13)) AS `name`, min(`id`) AS `first_id`
		FROM `habits`
		WHERE `category` IS NOT NULL
			AND trim(substr(trim(`category`, ' ' || char(9) || char(10) || char(13)), 1, 20), ' ' || char(9) || char(10) || char(13)) <> ''
			AND lower(trim(substr(trim(`category`, ' ' || char(9) || char(10) || char(13)), 1, 20), ' ' || char(9) || char(10) || char(13))) <> 'anytime'
			AND lower(trim(substr(trim(`category`, ' ' || char(9) || char(10) || char(13)), 1, 20), ' ' || char(9) || char(10) || char(13))) NOT IN (SELECT lower(`name`) FROM `categories` WHERE `built_in` = 1)
		GROUP BY lower(trim(substr(trim(`category`, ' ' || char(9) || char(10) || char(13)), 1, 20), ' ' || char(9) || char(10) || char(13)))
	)
)
ORDER BY `first_id`;
--> statement-breakpoint
UPDATE `habits` SET `category_id` = (
	SELECT `c`.`id` FROM `categories` `c`
	WHERE `category` IS NOT NULL AND lower(`c`.`name`) = lower(trim(substr(trim(`category`, ' ' || char(9) || char(10) || char(13)), 1, 20), ' ' || char(9) || char(10) || char(13)))
);
--> statement-breakpoint
UPDATE `habits` SET `category_id` = (
	SELECT `id` FROM `categories` WHERE `built_in` = 1 AND `name` = 'Other'
)
WHERE `category_id` IS NULL;