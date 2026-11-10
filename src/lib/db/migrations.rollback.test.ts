/** @jest-environment node */
/// <reference types="node" />
// Node ambient types are scoped to this file — it only ever runs under Jest.
import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { createPartiallyMigratedTestDb } from "./test-db";

/**
 * "Nothing was changed" is only a promise the app may make if a failed update really leaves the
 * database as it was. The device migrator runs every pending migration between one BEGIN and one
 * COMMIT and ROLLBACKs on any error (`SQLiteSyncDialect.migrate`). This runs the real pending
 * migrations of an old-schema database the way it does, forces a failure after the very last
 * statement (the worst moment, with every table already rebuilt), and checks the schema and every
 * row are exactly what they were.
 */

const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const fixture = fs.readFileSync(
	path.join(__dirname, "__fixtures__/v1-era-0008.sql"),
	"utf8",
);

const journal: { entries: { tag: string }[] } = JSON.parse(
	fs.readFileSync(path.join(MIGRATIONS_DIR, "meta/_journal.json"), "utf8"),
);
const pendingTags = journal.entries
	.map((entry) => entry.tag)
	.filter((tag) => Number(tag.slice(0, 4)) >= 9);

function snapshot(sqlite: DatabaseSync): string {
	const tables = sqlite
		.prepare(
			"SELECT name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name",
		)
		.all() as { name: string; sql: string | null }[];
	return JSON.stringify(
		tables.map(({ name, sql }) => {
			const isTable = sql?.trim().toLowerCase().startsWith("create table");
			const rows = isTable
				? sqlite.prepare(`SELECT * FROM "${name}" ORDER BY 1`).all()
				: [];
			return { name, sql, rows };
		}),
	);
}

function migrateLikeTheDevice(sqlite: DatabaseSync, failAtTheEnd: boolean) {
	sqlite.exec("BEGIN");
	try {
		for (const tag of pendingTags) {
			const file = fs.readFileSync(
				path.join(MIGRATIONS_DIR, `${tag}.sql`),
				"utf8",
			);
			for (const statement of file.split("--> statement-breakpoint")) {
				if (statement.trim()) sqlite.exec(statement);
			}
		}
		if (failAtTheEnd) sqlite.exec("SELECT * FROM a_table_that_does_not_exist");
		sqlite.exec("COMMIT");
	} catch (error) {
		sqlite.exec("ROLLBACK");
		throw error;
	}
}

describe.each([true, false])(
	"a failed update (foreign keys %s)",
	(foreignKeys) => {
		function seeded() {
			const { sqlite } = createPartiallyMigratedTestDb("0009", { foreignKeys });
			sqlite.exec(fixture);
			return sqlite;
		}

		it("leaves the schema and every row exactly as they were", () => {
			const sqlite = seeded();
			const before = snapshot(sqlite);

			expect(() => migrateLikeTheDevice(sqlite, true)).toThrow();

			expect(snapshot(sqlite)).toBe(before);
		});

		it("is not a vacuous check: the same run without the failure does change the database", () => {
			const sqlite = seeded();
			const before = snapshot(sqlite);

			migrateLikeTheDevice(sqlite, false);

			expect(snapshot(sqlite)).not.toBe(before);
		});

		it("can be run again after the rollback, and then succeeds", () => {
			const sqlite = seeded();
			expect(() => migrateLikeTheDevice(sqlite, true)).toThrow();

			expect(() => migrateLikeTheDevice(sqlite, false)).not.toThrow();
			expect(sqlite.prepare("SELECT count(*) AS n FROM habits").get()).toEqual({
				n: 7,
			});
		});
	},
);

describe("'No habits or history are deleted' (SY3) stays true", () => {
	const sqlOf = (tag: string) =>
		fs
			.readFileSync(path.join(MIGRATIONS_DIR, `${tag}.sql`), "utf8")
			.split("\n")
			.map((line) => line.replace(/--.*$/, ""))
			.join("\n");

	/** Statements that remove user rows or columns; helper tables (`__old_*`) and TEMP tables are the migrator's own scratch. */
	const DESTRUCTIVE =
		/(delete\s+from\s+"?(?!sqlite_sequence)(\w+)"?|drop\s+table\s+(?:if\s+exists\s+)?"?(?!__)(\w+)"?|drop\s+column)/gi;

	it("no migration deletes rows or drops a table or column other than its own scratch space", () => {
		const offenders: string[] = [];
		for (const { tag } of journal.entries) {
			const sql = sqlOf(tag);
			for (const match of sql.matchAll(DESTRUCTIVE)) {
				const statement = match[0];
				if (
					/temp/i.test(sql) &&
					/drop\s+table/i.test(statement) &&
					/temp/i.test(sql)
				) {
					const name = match[3];
					if (
						name &&
						new RegExp(`create\\s+temp\\s+table\\s+"?${name}"?`, "i").test(sql)
					)
						continue;
				}
				offenders.push(`${tag}: ${statement}`);
			}
		}
		expect(offenders).toEqual([]);
	});
});
