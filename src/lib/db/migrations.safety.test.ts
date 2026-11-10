/** @jest-environment node */
/// <reference types="node" />
import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import {
	generateSQLiteDrizzleJson,
	generateSQLiteMigration,
} from "drizzle-kit/api";
import { getTableName, is } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import * as schema from "./schema";
import { createPartiallyMigratedTestDb } from "./test-db";

// The device migrator applies every pending migration in one BEGIN...COMMIT and only compares the
// last applied `created_at` with each journal `when`, so a mistake here ships silently.

const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const META_DIR = path.join(MIGRATIONS_DIR, "meta");

type JournalEntry = { idx: number; when: number; tag: string };
const journal: { entries: JournalEntry[] } = JSON.parse(
	fs.readFileSync(path.join(META_DIR, "_journal.json"), "utf8"),
);
const tags = journal.entries.map((entry) => entry.tag);
const prefixOf = (tag: string) => tag.slice(0, 4);

// So prose about a PRAGMA isn't mistaken for one.
function sqlOf(tag: string): string {
	return fs
		.readFileSync(path.join(MIGRATIONS_DIR, `${tag}.sql`), "utf8")
		.split("\n")
		.map((line) => line.replace(/--.*$/, ""))
		.join("\n");
}

describe("journal, snapshots and files", () => {
	it("has strictly increasing `when` (the migrator skips a lower one silently)", () => {
		const whens = journal.entries.map((entry) => entry.when);
		whens.slice(1).forEach((when, i) => {
			expect(when).toBeGreaterThan(whens[i]);
		});
	});

	it("numbers entries by position, with the tag's prefix matching", () => {
		journal.entries.forEach((entry, position) => {
			expect(entry.idx).toBe(position);
			expect(prefixOf(entry.tag)).toBe(String(position).padStart(4, "0"));
		});
	});

	it("has exactly one .sql file per journal entry, and no strays", () => {
		const files = fs
			.readdirSync(MIGRATIONS_DIR)
			.filter((file) => file.endsWith(".sql"))
			.map((file) => file.replace(/\.sql$/, ""))
			.sort();
		expect(files).toEqual([...tags].sort());
	});

	it("has one snapshot per entry, chained by prevId", () => {
		const zero = "00000000-0000-0000-0000-000000000000";
		let previousId = zero;
		for (const tag of tags) {
			const snapshot = JSON.parse(
				fs.readFileSync(
					path.join(META_DIR, `${prefixOf(tag)}_snapshot.json`),
					"utf8",
				),
			);
			expect(snapshot.prevId).toBe(previousId);
			previousId = snapshot.id;
		}
		const snapshots = fs
			.readdirSync(META_DIR)
			.filter((file) => file.endsWith("_snapshot.json"));
		expect(snapshots).toHaveLength(tags.length);
	});

	it("imports every migration, in order, in migrations.js", () => {
		const source = fs.readFileSync(
			path.join(MIGRATIONS_DIR, "migrations.js"),
			"utf8",
		);
		const imported = [
			...source.matchAll(/from "\.\/(\d{4}_[a-z_]+)\.sql"/g),
		].map((match) => match[1]);
		expect(imported).toEqual(tags);
		const keys = [...source.matchAll(/^\s+(m\d{4}),$/gm)].map((m) => m[1]);
		expect(keys).toEqual(tags.map((tag) => `m${prefixOf(tag)}`));
	});

	it("never relies on PRAGMA foreign_keys (a no-op inside the migrator's transaction)", () => {
		for (const tag of tags) {
			expect({ tag, uses: /PRAGMA\s+foreign_keys/i.test(sqlOf(tag)) }).toEqual({
				tag,
				uses: false,
			});
		}
	});

	it("defers foreign keys wherever it drops habits or categories", () => {
		for (const tag of tags) {
			const sql = sqlOf(tag);
			const dropsParent =
				/DROP\s+TABLE\s+`?(habits|categories)`?\s*[;\n]/i.test(sql);
			if (dropsParent) {
				expect({
					tag,
					deferred: /PRAGMA\s+defer_foreign_keys\s*=\s*ON/i.test(sql),
				}).toEqual({
					tag,
					deferred: true,
				});
			}
		}
	});
});

function tablesOf(sqlite: DatabaseSync): string[] {
	return (
		sqlite
			.prepare(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
			)
			.all() as { name: string }[]
	).map((row) => row.name);
}

type Column = {
	name: string;
	type: string;
	notnull: number;
	dflt_value: unknown;
	pk: number;
};
type ForeignKey = { from: string; table: string; to: string };

function foreignKeysOf(sqlite: DatabaseSync, table: string): ForeignKey[] {
	return sqlite
		.prepare(`PRAGMA foreign_key_list(\`${table}\`)`)
		.all() as ForeignKey[];
}

function insertionOrder(sqlite: DatabaseSync): string[] {
	const remaining = new Set(tablesOf(sqlite));
	const ordered: string[] = [];
	while (remaining.size > 0) {
		const ready = [...remaining].filter((table) =>
			foreignKeysOf(sqlite, table).every(
				(fk) => fk.table === table || !remaining.has(fk.table),
			),
		);
		if (ready.length === 0) throw new Error("foreign key cycle");
		for (const table of ready) {
			ordered.push(table);
			remaining.delete(table);
		}
	}
	return ordered;
}

// The middle row is deleted to leave an id gap, as a real install has; values derive from the column name so unique indexes never collide.
function seedEveryTable(sqlite: DatabaseSync) {
	for (const table of insertionOrder(sqlite)) {
		const columns = sqlite
			.prepare(`PRAGMA table_info(\`${table}\`)`)
			.all() as Column[];
		const fks = foreignKeysOf(sqlite, table);
		const autoId = columns.some((c) => c.name === "id" && c.pk === 1);
		for (let i = 1; i <= 3; i++) {
			const names: string[] = [];
			const values: (string | number)[] = [];
			for (const column of columns) {
				if (autoId && column.name === "id") continue;
				if (column.notnull === 0 && column.dflt_value !== null && !fks.length) {
				}
				const fk = fks.find((candidate) => candidate.from === column.name);
				if (fk) {
					const parents = sqlite
						.prepare(
							`SELECT \`${fk.to}\` AS id FROM \`${fk.table}\` ORDER BY \`${fk.to}\``,
						)
						.all() as { id: number }[];
					if (parents.length === 0) {
						if (column.notnull)
							throw new Error(`no parent row for ${table}.${column.name}`);
						continue;
					}
					names.push(column.name);
					values.push(parents[(i - 1) % parents.length].id);
				} else if (column.notnull === 1 && column.dflt_value === null) {
					names.push(column.name);
					values.push(
						/int/i.test(column.type)
							? 1000 + i
							: `${table}.${column.name}.${i}`,
					);
				}
			}
			sqlite
				.prepare(
					`INSERT INTO \`${table}\` (${names.map((n) => `\`${n}\``).join(",")}) VALUES (${names.map(() => "?").join(",")})`,
				)
				.run(...values);
		}
		if (autoId)
			sqlite.exec(
				`DELETE FROM \`${table}\` WHERE id = (SELECT id FROM \`${table}\` ORDER BY id LIMIT 1 OFFSET 1)`,
			);
	}
}

function countsOf(sqlite: DatabaseSync): Record<string, number> {
	return Object.fromEntries(
		tablesOf(sqlite).map((table) => [
			table,
			(
				sqlite.prepare(`SELECT count(*) AS n FROM \`${table}\``).get() as {
					n: number;
				}
			).n,
		]),
	);
}

function idsOf(sqlite: DatabaseSync, table: string): number[] {
	const hasId = (
		sqlite.prepare(`PRAGMA table_info(\`${table}\`)`).all() as Column[]
	).some((column) => column.name === "id");
	if (!hasId) return [];
	return (
		sqlite.prepare(`SELECT id FROM \`${table}\` ORDER BY id`).all() as {
			id: number;
		}[]
	).map((row) => row.id);
}

function sequencesOf(sqlite: DatabaseSync): Record<string, number> {
	return Object.fromEntries(
		(
			sqlite.prepare("SELECT name, seq FROM sqlite_sequence").all() as {
				name: string;
				seq: number;
			}[]
		).map((row) => [row.name, row.seq]),
	);
}

const upgradeSteps = tags.slice(1).map((tag) => prefixOf(tag));

describe.each([true, false])(
	"upgrading with foreign keys %s",
	(foreignKeys) => {
		it.each(upgradeSteps)(
			"a seeded DB at the step before %s upgrades to HEAD in one transaction without losing data",
			(stopBefore) => {
				const { sqlite, migrateRest } = createPartiallyMigratedTestDb(
					stopBefore,
					{ foreignKeys },
				);
				seedEveryTable(sqlite);
				const before = countsOf(sqlite);
				const idsBefore = Object.fromEntries(
					Object.keys(before).map((t) => [t, idsOf(sqlite, t)]),
				);
				const seqBefore = sequencesOf(sqlite);
				expect(Object.values(before).some((n) => n >= 2)).toBe(true);

				migrateRest();

				expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
				const after = countsOf(sqlite);
				for (const table of Object.keys(before)) {
					expect({ table, count: after[table] }).toEqual({
						table,
						count: before[table],
					});
					for (const id of idsBefore[table]) {
						expect(idsOf(sqlite, table)).toContain(id);
					}
				}
				const seqAfter = sequencesOf(sqlite);
				for (const [name, seq] of Object.entries(seqBefore)) {
					expect(seqAfter[name] ?? 0).toBeGreaterThanOrEqual(seq);
				}
				expect(
					tablesOf(sqlite).filter((name) => name.startsWith("__")),
				).toEqual([]);
			},
		);
	},
);

describe("integrity at HEAD (foreign keys are off on the device)", () => {
	const lastTag = prefixOf(tags[tags.length - 1]);

	it.each([true, false])(
		"a freshly migrated database passes foreign_key_check and integrity_check (foreign keys %s)",
		(foreignKeys) => {
			const { sqlite, migrateRest } = createPartiallyMigratedTestDb(lastTag, {
				foreignKeys,
			});
			migrateRest();

			expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
			expect(sqlite.prepare("PRAGMA integrity_check").all()).toEqual([
				{ integrity_check: "ok" },
			]);
		},
	);

	it("foreign_key_check really reports an orphan when keys are off — the assertions above can fail", () => {
		const { sqlite, migrateRest } = createPartiallyMigratedTestDb(lastTag, {
			foreignKeys: false,
		});
		migrateRest();
		sqlite
			.prepare(
				"INSERT INTO entries (habit_id, date, created_at) VALUES (9999, '2026-09-01', 0)",
			)
			.run();

		expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toHaveLength(1);
	});
});

describe("an old-schema database (migration 0008) upgraded to HEAD", () => {
	const fixture = fs.readFileSync(
		path.join(__dirname, "__fixtures__/v1-era-0008.sql"),
		"utf8",
	);

	function upgraded(foreignKeys: boolean) {
		const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0009", {
			foreignKeys,
		});
		sqlite.exec(fixture);
		const before = countsOf(sqlite);
		migrateRest();
		return { sqlite, before };
	}

	it.each([true, false])(
		"keeps every row and every reference (foreign keys %s)",
		(foreignKeys) => {
			const { sqlite, before } = upgraded(foreignKeys);

			expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
			const after = countsOf(sqlite);
			for (const table of Object.keys(before)) {
				expect({ table, count: after[table] }).toEqual({
					table,
					count: before[table],
				});
			}
			expect(after.habits).toBe(7);
			expect(after.entries).toBe(12);
			expect(after.reminders).toBe(3);
			expect(after.categories).toBe(12);
		},
	);

	it("maps free-text categories onto the managed set", () => {
		const { sqlite } = upgraded(true);
		const rows = sqlite
			.prepare(
				"SELECT h.id, c.name AS category, c.built_in AS builtIn FROM habits h JOIN categories c ON c.id = h.category_id ORDER BY h.id",
			)
			.all() as { id: number; category: string; builtIn: number }[];

		expect(rows.map((row) => [row.id, row.category])).toEqual([
			[1, "Morning"],
			[2, "Morning"], // 'morning ' — case/space-insensitive duplicate
			[3, "Health"], // matches a built-in
			[4, "Other"], // no category
			[5, "Other"], // 'Anytime'
			[6, "Evening routine with"], // cut to 20 characters
			[7, "Morning"],
		]);
		expect(
			rows.filter((row) => row.builtIn === 0).map((row) => row.category),
		).toEqual(["Morning", "Morning", "Evening routine with", "Morning"]);
	});

	it("preserves habit fields, ordering, archive state and the id high-water mark", () => {
		const { sqlite } = upgraded(true);
		const read = sqlite.prepare("SELECT * FROM habits WHERE id = ?");

		expect(read.get(1)).toMatchObject({
			name: "Glass of water",
			target_type: "quantity",
			target_amount: 8,
			target_unit: "glasses",
			frequency_type: "daily",
			sort_order: 1,
		});
		expect(read.get(3)).toMatchObject({
			frequency_type: "weekdays",
			frequency_weekdays: "[1,3,5]",
		});
		expect(read.get(5)).toMatchObject({
			frequency_type: "per-week",
			frequency_times_per_week: 4,
			archived_at: 1785000000,
			paused_ranges: '[{"from":"2026-08-01","to":"2026-08-10"}]',
		});

		const inserted = sqlite
			.prepare(
				"INSERT INTO habits (name, category_id, created_at, updated_at) VALUES ('New', 1, 0, 0) RETURNING id",
			)
			.get() as { id: number };
		expect(inserted.id).toBe(9); // id 8 was deleted before the upgrade and is never reused
	});

	it("keeps entries, notes, freezes, reminders and settings joined to the same habits", () => {
		const { sqlite } = upgraded(true);
		const count = (sql: string) =>
			(sqlite.prepare(sql).get() as { n: number }).n;

		expect(
			count(
				"SELECT count(*) AS n FROM entries e JOIN habits h ON h.id = e.habit_id WHERE h.id = 1",
			),
		).toBe(3);
		expect(
			count(
				"SELECT count(*) AS n FROM entry_notes n JOIN habits h ON h.id = n.habit_id WHERE h.name = 'Read'",
			),
		).toBe(1);
		expect(
			count("SELECT count(*) AS n FROM frozen_days WHERE habit_id IN (2, 3)"),
		).toBe(2);
		expect(
			count(
				"SELECT count(*) AS n FROM reminders WHERE habit_id = 2 AND enabled = 0 AND hour = 7 AND minute = 30",
			),
		).toBe(1);
		expect(count("SELECT count(*) AS n FROM app_settings")).toBe(2);
	});
});

describe("schema drift", () => {
	it("schema.ts matches the latest snapshot (drizzle-kit would generate nothing)", async () => {
		const latest = JSON.parse(
			fs.readFileSync(
				path.join(META_DIR, `${prefixOf(tags[tags.length - 1])}_snapshot.json`),
				"utf8",
			),
		);

		const current = await generateSQLiteDrizzleJson(
			schema as unknown as Record<string, unknown>,
		);
		const statements = await generateSQLiteMigration(latest, current);

		expect(statements).toEqual([]);
	});

	it("HEAD's tables are exactly the ones schema.ts declares", async () => {
		const declared = Object.values(schema)
			.filter((value) => is(value, SQLiteTable))
			.map((table) => getTableName(table as never))
			.sort();
		const { sqlite, migrateRest } = createPartiallyMigratedTestDb("0001");
		migrateRest();

		expect(tablesOf(sqlite)).toEqual(declared);
	});
});
