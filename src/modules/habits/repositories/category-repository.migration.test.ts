import { createPartiallyMigratedTestDb } from "@/lib/db/test-db";
import { BUILT_IN_CATEGORIES, CATEGORY_ROTATION } from "../constants";

/**
 * HAB-24's data migration (0009 + 0010): V1's free-text `category` strings →
 * the managed category set, with every habit backfilled to a `category_id`.
 * Rows are written in the V1 shape (migrated up to 0008), then the rest runs.
 */

type CategoryRow = {
	id: number;
	name: string;
	shape: string;
	hue: number | null;
	built_in: number;
};

function insertV1Habit(
	sqlite: ReturnType<typeof createPartiallyMigratedTestDb>["sqlite"],
	name: string,
	category: string | null,
) {
	sqlite
		.prepare(
			"INSERT INTO habits (name, icon, color, category, created_at, updated_at) VALUES (?, 'drop', 'blue', ?, 0, 0)",
		)
		.run(name, category);
}

function categoriesOf(
	sqlite: ReturnType<typeof createPartiallyMigratedTestDb>["sqlite"],
): CategoryRow[] {
	return sqlite
		.prepare(
			"SELECT id, name, shape, hue, built_in FROM categories ORDER BY id",
		)
		.all() as CategoryRow[];
}

function habitCategoryNames(
	sqlite: ReturnType<typeof createPartiallyMigratedTestDb>["sqlite"],
): Record<string, string> {
	const rows = sqlite
		.prepare(
			"SELECT h.name AS habit, c.name AS category FROM habits h JOIN categories c ON c.id = h.category_id ORDER BY h.id",
		)
		.all() as { habit: string; category: string }[];
	return Object.fromEntries(rows.map((row) => [row.habit, row.category]));
}

describe("HAB-24 category migration", () => {
	it("seeds exactly BUILT_IN_CATEGORIES, in order, with Other's hue null", () => {
		const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0009");
		migrateRest();

		const seeded = categoriesOf(sqlite).map(
			({ name, shape, hue, built_in }) => ({
				name,
				shape,
				hue,
				builtIn: built_in === 1,
			}),
		);
		expect(seeded).toEqual(
			BUILT_IN_CATEGORIES.map((builtIn) => ({ ...builtIn, builtIn: true })),
		);
		expect(seeded.find((c) => c.name === "Other")?.hue).toBeNull();
	});

	it("maps every V1 string to a built-in, a deduped custom, or Other", () => {
		const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0009");
		// [habit name, V1 category string] — in creation order.
		const v1: [string, string | null][] = [
			["h-health-lower", "health"],
			["h-health-padded", " Health "],
			["h-morning", "Morning"],
			["h-morning-lower", "morning"],
			["h-null", null],
			["h-empty", ""],
			["h-whitespace", "  \t "],
			["h-anytime", "Anytime"],
			["h-anytime-lower", "anytime"],
			["h-long-1", "Weekend projects at home"],
			["h-long-2", "Weekend projects at the cabin"],
			["h-evening", "Evening"],
			["h-other", "other"],
			["h-padded-custom", "  Reading list  "],
		];
		for (const [name, category] of v1) insertV1Habit(sqlite, name, category);

		migrateRest();

		expect(habitCategoryNames(sqlite)).toEqual({
			"h-health-lower": "Health",
			"h-health-padded": "Health",
			"h-morning": "Morning",
			"h-morning-lower": "Morning",
			"h-null": "Other",
			"h-empty": "Other",
			"h-whitespace": "Other",
			"h-anytime": "Other",
			"h-anytime-lower": "Other",
			// Both share the 20-char prefix "Weekend projects at " → trimmed, one category.
			"h-long-1": "Weekend projects at",
			"h-long-2": "Weekend projects at",
			"h-evening": "Evening",
			"h-other": "Other",
			"h-padded-custom": "Reading list",
		});
	});

	it("creates customs once each, first-seen casing, on rotation slots in order", () => {
		const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0009");
		insertV1Habit(sqlite, "a", "morning");
		insertV1Habit(sqlite, "b", "Morning");
		insertV1Habit(sqlite, "c", "Weekend projects at home");
		insertV1Habit(sqlite, "d", "weekend projects at the cabin");
		insertV1Habit(sqlite, "e", "Evening");
		migrateRest();

		const customs = categoriesOf(sqlite).filter((c) => c.built_in === 0);
		expect(customs.map((c) => c.name)).toEqual([
			"morning",
			"Weekend projects at",
			"Evening",
		]);
		expect(customs.map(({ shape, hue }) => ({ shape, hue }))).toEqual(
			CATEGORY_ROTATION.slice(0, 3),
		);
		// Customs come after every built-in — the picker's order is id order.
		const ids = categoriesOf(sqlite).map((c) => c.id);
		expect(Math.min(...customs.map((c) => c.id))).toBeGreaterThan(
			ids[BUILT_IN_CATEGORIES.length - 1],
		);
		for (const custom of customs) {
			expect(custom.name.length).toBeLessThanOrEqual(20);
		}
	});

	it("leaves category_id required and the legacy columns in place", () => {
		const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0009");
		insertV1Habit(sqlite, "kept", "Morning");
		migrateRest();

		const legacy = sqlite
			.prepare("SELECT icon, color, category FROM habits")
			.get() as Record<string, string>;
		expect(legacy).toEqual({
			icon: "drop",
			color: "blue",
			category: "Morning",
		});

		expect(() =>
			sqlite
				.prepare(
					"INSERT INTO habits (name, created_at, updated_at) VALUES ('x', 0, 0)",
				)
				.run(),
		).toThrow(/NOT NULL/);
	});
});

/**
 * Every table with a foreign key to `habits` — 0010 rebuilds `habits`, and none
 * of these cascade, so each row must come through untouched and still point at
 * the same habit. Runs through the migrator's single BEGIN…COMMIT (see
 * `test-db.ts`), where `PRAGMA foreign_keys` can't be switched off.
 */
const HABIT_CHILD_TABLES = [
	"entries",
	"entry_notes",
	"frozen_days",
	"reminders",
] as const;

describe.each([
	["on (as Jest's node:sqlite)", true],
	["off (expo-sqlite's default)", false],
])("HAB-24 migration with foreign keys %s", (_label, foreignKeys) => {
	it("keeps every row referencing a habit, pointing at the same habit", () => {
		const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0009", {
			foreignKeys,
		});
		expect(
			(sqlite.prepare("PRAGMA foreign_keys").get() as { foreign_keys: number })
				.foreign_keys,
		).toBe(foreignKeys ? 1 : 0);

		// Ids with a gap (2 was deleted in V1) — copied ids must stay exact.
		for (const [id, name, category] of [
			[1, "Water", "Health"],
			[3, "Journal", "Evening"],
			[4, "Lights out", null],
		] as const) {
			sqlite
				.prepare(
					"INSERT INTO habits (id, name, icon, color, category, created_at, updated_at) VALUES (?, ?, 'drop', 'blue', ?, 0, 0)",
				)
				.run(id, name, category);
		}
		for (const habitId of [1, 3, 4]) {
			sqlite
				.prepare(
					"INSERT INTO entries (habit_id, date, value, created_at) VALUES (?, '2026-09-01', ?, 0)",
				)
				.run(habitId, habitId * 2);
			sqlite
				.prepare(
					"INSERT INTO entry_notes (habit_id, date, note, updated_at) VALUES (?, '2026-09-01', ?, 0)",
				)
				.run(habitId, `note ${habitId}`);
			sqlite
				.prepare(
					"INSERT INTO frozen_days (habit_id, date, created_at) VALUES (?, '2026-08-30', 0)",
				)
				.run(habitId);
			sqlite
				.prepare(
					"INSERT INTO reminders (habit_id, hour, minute, weekdays, enabled, created_at) VALUES (?, 9, 0, '1,2,3', 1, 0)",
				)
				.run(habitId);
		}

		const snapshot = () =>
			Object.fromEntries(
				HABIT_CHILD_TABLES.map((table) => [
					table,
					sqlite
						.prepare(
							`SELECT t.*, h.name AS habit_name FROM ${table} t JOIN habits h ON h.id = t.habit_id ORDER BY t.id`,
						)
						.all(),
				]),
			);
		const before = snapshot();
		for (const table of HABIT_CHILD_TABLES) {
			expect(before[table]).toHaveLength(3);
		}

		migrateRest();

		// Same rows, same columns, same habit (joined by id → same name).
		expect(snapshot()).toEqual(before);
		expect(
			sqlite.prepare("SELECT id, name FROM habits ORDER BY id").all(),
		).toEqual([
			{ id: 1, name: "Water" },
			{ id: 3, name: "Journal" },
			{ id: 4, name: "Lights out" },
		]);
		expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
		// The rebuild's scratch table is gone.
		expect(
			sqlite
				.prepare(
					"SELECT name FROM sqlite_master WHERE name IN ('__old_habits', '__new_habits')",
				)
				.all(),
		).toEqual([]);
	});

	it("leaves habits' indexes, UNIQUE constraints and triggers exactly as they were", () => {
		const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0009", {
			foreignKeys,
		});
		// Everything sqlite_master holds *about* `habits` other than the table
		// itself (whose CREATE TABLE the rebuild changes on purpose), plus
		// index_list, which also reports UNIQUE constraints' auto-indexes.
		const schemaObjects = () => ({
			master: sqlite
				.prepare(
					"SELECT type, name, sql FROM sqlite_master WHERE tbl_name = 'habits' AND type != 'table' ORDER BY name",
				)
				.all(),
			indexes: sqlite.prepare("PRAGMA index_list(habits)").all(),
		});
		const before = schemaObjects();

		migrateRest();

		expect(schemaObjects()).toEqual(before);
	});

	it("keeps the AUTOINCREMENT high-water mark, so deleted habits' ids aren't reused", () => {
		const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0009", {
			foreignKeys,
		});
		for (let i = 0; i < 5; i++) insertV1Habit(sqlite, `h${i}`, null);
		sqlite.prepare("DELETE FROM habits WHERE id IN (4, 5)").run();

		migrateRest();

		expect(
			sqlite
				.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'habits'")
				.get(),
		).toEqual({ seq: 5 });
		const next = sqlite
			.prepare(
				"INSERT INTO habits (name, category_id, created_at, updated_at) SELECT 'next', id, 0, 0 FROM categories WHERE name = 'Other'",
			)
			.run();
		expect(next.lastInsertRowid).toBe(6);
	});

	it("keeps the habits table's foreign key to categories", () => {
		const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0009", {
			foreignKeys,
		});
		migrateRest();
		expect(
			sqlite.prepare("PRAGMA foreign_key_list(habits)").all(),
		).toMatchObject([{ table: "categories", from: "category_id", to: "id" }]);
	});
});
