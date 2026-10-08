-- A V1-era database as an installed app would hold it: schema up to migration
-- 0008 (before HAB-24 categories), with realistic rows in every table. Applied
-- on top of a DB migrated to 0008, then upgraded to HEAD by
-- migrations.safety.test.ts. Dates are local "yyyy-MM-dd" text; instants are
-- integer seconds.

INSERT INTO habits (id, name, icon, color, category, direction, target_type, target_amount, target_unit, frequency_type, frequency_weekdays, frequency_times_per_week, sort_order, archived_at, paused_ranges, created_at, updated_at) VALUES
	(1, 'Glass of water', 'drop', 'blue',   'Morning',   'build', 'quantity', 8,    'glasses', 'daily',    NULL,      NULL, 1, NULL,       NULL, 1780000000, 1780000000),
	(2, 'Meditate',       'leaf', 'purple', 'morning ',  'build', 'simple',   NULL, NULL,      'daily',    NULL,      NULL, 2, NULL,       NULL, 1780000100, 1780000100),
	(3, 'Gym',            'bolt', 'orange', 'Health',    'build', 'simple',   NULL, NULL,      'weekdays', '[1,3,5]', NULL, 3, NULL,       NULL, 1780000200, 1780000200),
	(4, 'No phone in bed','moon', 'teal',   NULL,        'break', 'simple',   NULL, NULL,      'daily',    NULL,      NULL, 4, NULL,       NULL, 1780000300, 1780000300),
	(5, 'Read',           'book', 'green',  'Anytime',   'build', 'quantity', 20,   'pages',   'per-week', NULL,      4,    5, 1785000000, '[{"from":"2026-08-01","to":"2026-08-10"}]', 1780000400, 1785000000),
	(6, 'Journal',        'pen',  'red',    'Evening routine with a very long name', 'build', 'simple', NULL, NULL, 'daily', NULL, NULL, 6, NULL, NULL, 1780000500, 1780000500),
	(7, 'Temporary',      'dot',  'blue',   'Morning',   'build', 'simple',   NULL, NULL,      'daily',    NULL,      NULL, 7, NULL,       NULL, 1780000600, 1780000600);

INSERT INTO entries (habit_id, date, value, created_at) VALUES
	(1, '2026-09-28', 8,    1790000000),
	(1, '2026-09-29', 5,    1790086400),
	(1, '2026-09-30', 8,    1790172800),
	(2, '2026-09-29', NULL, 1790086500),
	(2, '2026-09-30', NULL, 1790172900),
	(3, '2026-09-28', NULL, 1790000100),
	(3, '2026-09-30', NULL, 1790173000),
	(4, '2026-09-29', NULL, 1790086600),
	(5, '2026-07-30', 20,   1785100000),
	(5, '2026-07-31', 22,   1785186400),
	(6, '2026-09-30', NULL, 1790173100),
	(7, '2026-09-30', NULL, 1790173200);

INSERT INTO frozen_days (habit_id, date, created_at) VALUES
	(2, '2026-09-28', 1790000200),
	(3, '2026-09-26', 1789900000);

INSERT INTO entry_notes (habit_id, date, note, updated_at) VALUES
	(1, '2026-09-29', 'Hotel — only the free glasses', 1790086700),
	(5, '2026-07-31', 'Finished the chapter', 1785186500);

INSERT INTO reminders (habit_id, hour, minute, weekdays, enabled, created_at) VALUES
	(1, 8,  0,  '[1,2,3,4,5,6,7]', 1, 1780000050),
	(2, 7,  30, '[1,2,3,4,5]',     0, 1780000150),
	(3, 18, 15, '[1,3,5]',         1, 1780000250);

INSERT INTO app_settings (key, value) VALUES
	('evening-review', 'true'),
	('first-run-seen', 'true');

-- A habit deleted before the upgrade: AUTOINCREMENT must never reuse id 8.
INSERT INTO habits (id, name, icon, color, direction, target_type, created_at, updated_at) VALUES (8, 'Gone', 'dot', 'blue', 'build', 'simple', 1780000700, 1780000700);
DELETE FROM habits WHERE id = 8;
