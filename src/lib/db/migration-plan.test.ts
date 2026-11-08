/** @jest-environment node */
/// <reference types="node" />
// Node ambient types are scoped to this file — it only ever runs under Jest.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { clearLog, getLogEntries } from "@/lib/logger/logger";
import { planMigrations } from "./migration-plan";

/** A real database: whatever SQLite says is what the plan sees. */
function reader(sqlite: DatabaseSync) {
	return {
		getFirstSync: <Row>(source: string): Row | null =>
			(sqlite.prepare(source).get() as Row | undefined) ?? null,
	};
}

function migrated(...createdAt: Array<number | string>): DatabaseSync {
	const sqlite = new DatabaseSync(":memory:");
	sqlite.exec(
		"CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash TEXT, created_at NUMERIC)",
	);
	for (const value of createdAt) {
		sqlite
			.prepare(
				"INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('h', ?)",
			)
			.run(value);
	}
	sqlite.exec("CREATE TABLE habits (id INTEGER PRIMARY KEY)");
	return sqlite;
}

beforeEach(() => clearLog());

describe("planMigrations", () => {
	it("is fresh only for a genuinely empty database", () => {
		expect(planMigrations(reader(new DatabaseSync(":memory:")), 500)).toBe(
			"fresh",
		);
	});

	it("is fresh when only an empty migrations table exists", () => {
		const sqlite = new DatabaseSync(":memory:");
		sqlite.exec(
			"CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash TEXT, created_at NUMERIC)",
		);
		expect(planMigrations(reader(sqlite), 500)).toBe("fresh");
	});

	it("is unreadable, not fresh, when tables exist but no migration was ever recorded", () => {
		const sqlite = new DatabaseSync(":memory:");
		sqlite.exec("CREATE TABLE habits (id INTEGER PRIMARY KEY)");
		expect(planMigrations(reader(sqlite), 500)).toBe("unreadable");

		sqlite.exec(
			"CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash TEXT, created_at NUMERIC)",
		);
		expect(planMigrations(reader(sqlite), 500)).toBe("unreadable");
	});

	it("is an upgrade when the last applied migration is older than the newest one shipped", () => {
		expect(planMigrations(reader(migrated(100, 400)), 500)).toBe("upgrade");
	});

	it("is current when the newest migration is already applied", () => {
		expect(planMigrations(reader(migrated(100, 500)), 500)).toBe("current");
	});

	it("is newer when the database was made by a newer build", () => {
		expect(planMigrations(reader(migrated(100, 500, 900)), 500)).toBe("newer");
	});

	it("reads created_at the way the migrator does: it can come back as text", () => {
		expect(planMigrations(reader(migrated("400")), 500)).toBe("upgrade");
		expect(planMigrations(reader(migrated("500")), 500)).toBe("current");
		expect(planMigrations(reader(migrated("900")), 500)).toBe("newer");
	});

	describe("a corrupt file", () => {
		let dir: string;
		beforeEach(() => {
			dir = fs.mkdtempSync(path.join(os.tmpdir(), "habits-plan-"));
		});
		afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

		it("is unreadable, not fresh, and logs only the error name", () => {
			const file = path.join(dir, "habits.db");
			fs.writeFileSync(file, Buffer.alloc(4096, 0x41));
			const sqlite = new DatabaseSync(file);
			try {
				expect(planMigrations(reader(sqlite), 500)).toBe("unreadable");
			} finally {
				sqlite.close();
			}
			const entry = getLogEntries().find(
				(e) => e.event === "migration.plan_unreadable",
			);
			expect(entry?.fields).toEqual({ errorName: "error" });
		});

		it("is unreadable when a real database loses its pages", () => {
			const file = path.join(dir, "habits.db");
			const good = new DatabaseSync(file);
			good.exec(
				"CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash TEXT, created_at NUMERIC)",
			);
			good.exec(
				"INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('h', 100)",
			);
			good.close();
			const bytes = fs.readFileSync(file);
			fs.writeFileSync(
				file,
				Buffer.concat([
					bytes.subarray(0, 100),
					Buffer.alloc(bytes.length - 100, 0xff),
				]),
			);
			const sqlite = new DatabaseSync(file);
			try {
				expect(planMigrations(reader(sqlite), 500)).toBe("unreadable");
			} finally {
				sqlite.close();
			}
		});
	});

	it("is unreadable for an I/O error that is not a missing table", () => {
		const failing = {
			getFirstSync: () => {
				throw new Error("disk I/O error");
			},
		};
		expect(planMigrations(failing, 500)).toBe("unreadable");
	});

	it("treats a thrown non-Error as unreadable", () => {
		const failing = {
			getFirstSync: () => {
				throw "nope";
			},
		};
		expect(planMigrations(failing, 500)).toBe("unreadable");
	});
});
