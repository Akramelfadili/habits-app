import { createPartiallyMigratedTestDb } from "@/lib/db/test-db";
import { BUILT_IN_CATEGORIES, CATEGORY_ROTATION } from "../constants";
import { categoryFixturesFor } from "../dev/category-fixtures";

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

describe("category migration", () => {
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

	it("maps every old string to a built-in, a deduped custom, or Other", () => {
		const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0009");
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
			// Both share the 20-char prefix "Weekend projects at ": trimmed, one category.
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
		expect(customs.map(({ shape, hue }) => ({ shape, hue }))).toEqual([
			CATEGORY_ROTATION[2],
			CATEGORY_ROTATION[0],
			CATEGORY_ROTATION[1],
		]);
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

// None of the FKs to `habits` cascade, so each row must survive the rebuild. The migrator's
// single BEGIN...COMMIT (see `test-db.ts`) means `PRAGMA foreign_keys` can't be switched off.
const HABIT_CHILD_TABLES = [
	"entries",
	"entry_notes",
	"frozen_days",
	"reminders",
] as const;

describe.each([
	["on (as Jest's node:sqlite)", true],
	["off (expo-sqlite's default)", false],
])("category migration with foreign keys %s", (_label, foreignKeys) => {
	it("keeps every row referencing a habit, pointing at the same habit", () => {
		const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0009", {
			foreignKeys,
		});
		expect(
			(sqlite.prepare("PRAGMA foreign_keys").get() as { foreign_keys: number })
				.foreign_keys,
		).toBe(foreignKeys ? 1 : 0);

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

		expect(snapshot()).toEqual(before);
		expect(
			sqlite.prepare("SELECT id, name FROM habits ORDER BY id").all(),
		).toEqual([
			{ id: 1, name: "Water" },
			{ id: 3, name: "Journal" },
			{ id: 4, name: "Lights out" },
		]);
		expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
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
		// The table's own CREATE TABLE changes on purpose; index_list also reports UNIQUE auto-indexes.
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

describe.each([true, false])(
	"sort-order category migration (foreign keys %s)",
	(foreignKeys) => {
		type Db = ReturnType<typeof createPartiallyMigratedTestDb>["sqlite"];

		function insertCustom(
			sqlite: Db,
			name: string,
			shape: string,
			hue: number,
		) {
			return Number(
				sqlite
					.prepare(
						"INSERT INTO categories (name, shape, hue, built_in, created_at) VALUES (?, ?, ?, 0, 0)",
					)
					.run(name, shape, hue).lastInsertRowid,
			);
		}

		function insertHabit(
			sqlite: Db,
			name: string,
			categoryName: string,
			{
				sortOrder,
				archived = false,
			}: { sortOrder: number; archived?: boolean },
		) {
			sqlite
				.prepare(
					"INSERT INTO habits (name, category_id, sort_order, archived_at, created_at, updated_at) SELECT ?, id, ?, ?, 0, 0 FROM categories WHERE name = ?",
				)
				.run(name, sortOrder, archived ? 1 : null, categoryName);
		}

		function orderOf(sqlite: Db): string[] {
			return (
				sqlite
					.prepare("SELECT name FROM categories ORDER BY sort_order, id")
					.all() as { name: string }[]
			).map((row) => row.name);
		}

		function appearanceOf(sqlite: Db, name: string) {
			return sqlite
				.prepare("SELECT shape, hue FROM categories WHERE name = ?")
				.get(name);
		}

		it("moves Health to 175 and Social to 230, matching BUILT_IN_CATEGORIES", () => {
			const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0011", {
				foreignKeys,
			});
			migrateRest();

			const builtIns = categoriesOf(sqlite)
				.filter((c) => c.built_in === 1)
				.map(({ name, shape, hue }) => ({ name, shape, hue }));
			expect(builtIns).toEqual(
				BUILT_IN_CATEGORIES.map(({ name, shape, hue }) => ({
					name,
					shape,
					hue,
				})),
			);
			expect(appearanceOf(sqlite, "Health")).toEqual({
				shape: "plus",
				hue: 175,
			});
			expect(appearanceOf(sqlite, "Social")).toEqual({
				shape: "half",
				hue: 230,
			});
		});

		it("keeps no red hue and no custom on a built-in's hue in the rotation", () => {
			const hues = CATEGORY_ROTATION.map((slot) => slot.hue);
			for (const dropped of [15, 350, 175, 230]) {
				expect(hues).not.toContain(dropped);
			}
			const builtInHues = BUILT_IN_CATEGORIES.map((c) => c.hue);
			for (const hue of hues) expect(builtInHues).not.toContain(hue);
		});

		it("moves customs on 175, 230, 15 and 350 to the emptiest slot, in id order, and leaves the rest", () => {
			const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0011", {
				foreignKeys,
			});
			insertCustom(sqlite, "Music", "ring", 330);
			insertCustom(sqlite, "Language", "square", 95);
			insertCustom(sqlite, "Garden", "ring", 330);
			insertCustom(sqlite, "Morning", "diamond", 175);
			insertCustom(sqlite, "Side project", "dot", 15);
			insertCustom(sqlite, "Pets", "lines", 350);
			insertCustom(sqlite, "Kids", "grid", 230);
			insertCustom(sqlite, "Cooking", "diamond", 175);
			insertCustom(sqlite, "Choir", "dot", 15);
			insertHabit(sqlite, "Practice", "Morning", { sortOrder: 1 });
			migrateRest();

			const byName = Object.fromEntries(
				categoriesOf(sqlite)
					.filter((c) => c.built_in === 0)
					.map((c) => [c.name, { shape: c.shape, hue: c.hue }]),
			);
			expect(byName).toEqual({
				Music: { shape: "ring", hue: 330 },
				Language: { shape: "square", hue: 95 },
				Garden: { shape: "ring", hue: 330 },
				Morning: { shape: "bars", hue: 220 },
				"Side project": { shape: "plus", hue: 265 },
				Pets: { shape: "half", hue: 130 },
				Kids: { shape: "archive", hue: 290 },
				Cooking: { shape: "square", hue: 95 },
				Choir: { shape: "bars", hue: 220 },
			});
			expect(habitCategoryNames(sqlite)).toEqual({ Practice: "Morning" });
		});

		it("backfills sort_order from first appearance among active habits, then archived, then unused by id, Other last", () => {
			const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0011", {
				foreignKeys,
			});
			insertCustom(sqlite, "Music", "ring", 330);
			insertCustom(sqlite, "Garden", "square", 95);
			insertCustom(sqlite, "Unused custom", "bars", 220);
			insertHabit(sqlite, "Stretch", "Other", { sortOrder: 1 });
			insertHabit(sqlite, "Piano", "Music", { sortOrder: 3 });
			insertHabit(sqlite, "Run", "Fitness", { sortOrder: 2 });
			insertHabit(sqlite, "Lift", "Fitness", { sortOrder: 4 });
			insertHabit(sqlite, "Read", "Learning", { sortOrder: 5 });
			insertHabit(sqlite, "Budget", "Finance", { sortOrder: 5 });
			insertHabit(sqlite, "Weed", "Garden", { sortOrder: 0, archived: true });
			insertHabit(sqlite, "Floss", "Health", { sortOrder: 7, archived: true });
			insertHabit(sqlite, "Old piano", "Music", {
				sortOrder: 0,
				archived: true,
			});
			migrateRest();

			expect(orderOf(sqlite)).toEqual([
				"Fitness",
				"Music",
				"Learning",
				"Finance",
				"Garden",
				"Health",
				"Mindfulness",
				"Productivity",
				"Social",
				"Home",
				"Creativity",
				"Unused custom",
				"Other",
			]);
			const orders = (
				sqlite
					.prepare("SELECT sort_order FROM categories ORDER BY sort_order")
					.all() as { sort_order: number }[]
			).map((row) => row.sort_order);
			expect(orders).toEqual(orders.map((_, index) => index + 1));
		});

		it("orders a fresh install's built-ins by id with Other last", () => {
			const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0011", {
				foreignKeys,
			});
			migrateRest();
			expect(orderOf(sqlite)).toEqual(BUILT_IN_CATEGORIES.map((c) => c.name));
		});

		it("keeps every habit and entry, every join, and changes no table but categories", () => {
			const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0011", {
				foreignKeys,
			});
			insertCustom(sqlite, "Morning", "diamond", 175);
			insertCustom(sqlite, "Music", "ring", 330);
			insertHabit(sqlite, "Stretch", "Morning", { sortOrder: 1 });
			insertHabit(sqlite, "Piano", "Music", { sortOrder: 2 });
			insertHabit(sqlite, "Floss", "Health", { sortOrder: 3, archived: true });
			insertHabit(sqlite, "Walk", "Other", { sortOrder: 4 });
			sqlite
				.prepare(
					"INSERT INTO entries (habit_id, date, created_at) SELECT id, '2026-10-01', 0 FROM habits",
				)
				.run();
			const schemaOf = () =>
				sqlite
					.prepare(
						"SELECT name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name",
					)
					.all() as { name: string; sql: string | null }[];
			const before = schemaOf();
			const joinsBefore = habitCategoryNames(sqlite);

			migrateRest();

			expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
			expect(sqlite.prepare("SELECT count(*) AS n FROM habits").get()).toEqual({
				n: 4,
			});
			expect(sqlite.prepare("SELECT count(*) AS n FROM entries").get()).toEqual(
				{ n: 4 },
			);
			expect(habitCategoryNames(sqlite)).toEqual(joinsBefore);
			const after = schemaOf();
			const changed = after
				.filter((row) => {
					const old = before.find((b) => b.name === row.name);
					return !old || old.sql !== row.sql;
				})
				.map((row) => row.name);
			expect(changed).toEqual(["categories"]);
			expect(after.map((row) => row.name)).toEqual(
				before.map((row) => row.name),
			);
		});

		if (!foreignKeys) {
			it("ignores a habit whose category_id dangles (keys are off on device)", () => {
				const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0011", {
					foreignKeys,
				});
				sqlite
					.prepare(
						"INSERT INTO habits (name, category_id, sort_order, created_at, updated_at) VALUES ('ghost', 999, 0, 0, 0)",
					)
					.run();
				insertHabit(sqlite, "Run", "Fitness", { sortOrder: 1 });
				migrateRest();
				expect(orderOf(sqlite).slice(0, 2)).toEqual(["Fitness", "Health"]);
				expect(
					sqlite.prepare("SELECT count(*) AS n FROM categories").get(),
				).toEqual({ n: 10 });
			});
		}
	},
);

describe("web fixtures vs migration 0011", () => {
	it.each(["many-categories", "default"] as const)(
		"%s customs look exactly as 0011 leaves them on an upgraded device",
		(scenario) => {
			const fixtures = categoryFixturesFor(
				scenario as Parameters<typeof categoryFixturesFor>[0],
			).filter((c) => !c.builtIn);
			const V2_SLOTS = [
				["diamond", 175],
				["ring", 330],
				["square", 95],
				["bars", 220],
				["dot", 15],
				["plus", 265],
				["half", 130],
				["lines", 350],
				["grid", 230],
				["archive", 290],
			] as const;
			const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0011");
			fixtures.forEach((fixture, index) => {
				const [shape, hue] = V2_SLOTS[index % V2_SLOTS.length];
				sqlite
					.prepare(
						"INSERT INTO categories (name, shape, hue, built_in, created_at) VALUES (?, ?, ?, 0, 0)",
					)
					.run(fixture.name, shape, hue);
			});
			migrateRest();

			const migrated = categoriesOf(sqlite)
				.filter((c) => c.built_in === 0)
				.map(({ name, shape, hue }) => ({ name, shape, hue }));
			expect(migrated).toEqual(
				fixtures.map(({ name, shape, hue }) => ({ name, shape, hue })),
			);
		},
	);
});
