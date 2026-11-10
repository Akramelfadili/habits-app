/** @jest-environment node */
/// <reference types="node" />
// Node ambient types are scoped to this file — it only ever runs under Jest.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { clearLog, getLogEntries } from "@/lib/logger/logger";
import {
	BACKUPS_TO_KEEP,
	type BackupFiles,
	type BackupSource,
	backupBeforeMigrating,
	backupName,
} from "./database-backup";

let dir: string;
let sqlite: DatabaseSync;

function openSource(migrations: number): BackupSource {
	sqlite = new DatabaseSync(path.join(dir, "habits.db"));
	sqlite.exec("PRAGMA journal_mode = WAL");
	sqlite.exec(
		"CREATE TABLE __drizzle_migrations (id INTEGER PRIMARY KEY, hash TEXT, created_at NUMERIC)",
	);
	for (let i = 0; i < migrations; i++) {
		sqlite
			.prepare(
				"INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
			)
			.run(`h${i}`, 100 + i);
	}
	sqlite.exec("CREATE TABLE things (id INTEGER PRIMARY KEY, label TEXT)");
	sqlite.exec("INSERT INTO things (label) VALUES ('alpha'), ('beta')");
	return {
		getFirstSync: <Row>(source: string) =>
			(sqlite.prepare(source).get() as Row | undefined) ?? null,
		runSync: (source, ...params) => sqlite.prepare(source).run(...params),
	};
}

function nodeFiles(folder: string): BackupFiles {
	fs.mkdirSync(folder, { recursive: true });
	return {
		names: () => fs.readdirSync(folder),
		pathFor: (name) => path.join(folder, name),
		sizeOf: (name) => fs.statSync(path.join(folder, name)).size,
		rename: (from, to) =>
			fs.renameSync(path.join(folder, from), path.join(folder, to)),
		remove: (name) => fs.rmSync(path.join(folder, name), { force: true }),
	};
}

const T0 = Date.UTC(2026, 10, 8, 10, 15, 0);

beforeEach(() => {
	dir = fs.mkdtempSync(path.join(os.tmpdir(), "habits-backup-"));
	clearLog();
});
afterEach(() => {
	sqlite?.close();
	fs.rmSync(dir, { recursive: true, force: true });
});

describe("backupName", () => {
	it("carries the time and the schema version, and sorts by time", () => {
		expect(backupName(12, T0)).toBe("habits-20261108T101500Z-v12.db");
		expect(backupName(3, T0 + 1000) > backupName(12, T0)).toBe(true);
	});
});

describe("backupBeforeMigrating", () => {
	it("copies a consistent snapshot, named for the database's schema version", () => {
		const source = openSource(5);
		const files = nodeFiles(path.join(dir, "backups"));

		const result = backupBeforeMigrating(source, () => files, T0);

		expect(result).toEqual({
			status: "done",
			name: "habits-20261108T101500Z-v5.db",
			bytes: expect.any(Number),
		});
		expect(files.names()).toEqual(["habits-20261108T101500Z-v5.db"]);
		const copy = new DatabaseSync(
			files.pathFor("habits-20261108T101500Z-v5.db"),
		);
		expect(copy.prepare("SELECT label FROM things ORDER BY id").all()).toEqual([
			{ label: "alpha" },
			{ label: "beta" },
		]);
		expect(copy.prepare("PRAGMA integrity_check").get()).toEqual({
			integrity_check: "ok",
		});
		copy.close();
	});

	it("logs the size in bytes, and no path", () => {
		const source = openSource(2);
		backupBeforeMigrating(
			source,
			() => nodeFiles(path.join(dir, "backups")),
			T0,
		);
		const entry = getLogEntries().find(
			(e) => e.event === "migration.backup_done",
		);
		expect(entry?.fields).toEqual({
			bytes: expect.any(Number),
			schemaVersion: 2,
		});
		expect(entry?.fields?.bytes).toBeGreaterThan(0);
	});

	it("keeps the newest three and deletes the older ones", () => {
		const source = openSource(4);
		const files = nodeFiles(path.join(dir, "backups"));
		for (let i = 0; i < 5; i++) {
			backupBeforeMigrating(source, () => files, T0 + i * 60_000);
		}
		expect(BACKUPS_TO_KEEP).toBe(3);
		expect(files.names().sort()).toEqual([
			backupName(4, T0 + 2 * 60_000),
			backupName(4, T0 + 3 * 60_000),
			backupName(4, T0 + 4 * 60_000),
		]);
	});

	it("never deletes a file it does not recognise, and clears a stale partial", () => {
		const source = openSource(4);
		const files = nodeFiles(path.join(dir, "backups"));
		fs.writeFileSync(files.pathFor("notes.txt"), "mine");
		fs.writeFileSync(
			files.pathFor("habits-20200101T000000Z-v1.db.partial"),
			"x",
		);
		backupBeforeMigrating(source, () => files, T0);
		expect(files.names().sort()).toEqual([
			"habits-20261108T101500Z-v4.db",
			"notes.txt",
		]);
	});

	it("a failed backup logs the error name only, leaves no partial and does not throw", () => {
		const source = openSource(4);
		const files = nodeFiles(path.join(dir, "backups"));
		const failing: BackupSource = {
			...source,
			runSync: () => {
				fs.writeFileSync(
					files.pathFor("habits-20261108T101500Z-v4.db.partial"),
					"half",
				);
				throw new RangeError("disk full at /private/path");
			},
		};

		const result = backupBeforeMigrating(failing, () => files, T0);

		expect(result).toEqual({ status: "failed" });
		expect(files.names()).toEqual([]);
		const entry = getLogEntries().find(
			(e) => e.event === "migration.backup_failed",
		);
		expect(entry?.fields).toEqual({ errorName: "rangeerror" });
		expect(JSON.stringify(entry)).not.toContain("private");
	});

	it("a failure to read the folder is also contained", () => {
		const source = openSource(4);
		const files: BackupFiles = {
			...nodeFiles(path.join(dir, "backups")),
			pathFor: () => {
				throw new Error("no folder");
			},
		};
		expect(backupBeforeMigrating(source, () => files, T0)).toEqual({
			status: "failed",
		});
	});

	it("a folder that cannot be opened is contained too", () => {
		const result = backupBeforeMigrating(
			openSource(4),
			() => {
				throw new Error("no folder");
			},
			T0,
		);
		expect(result).toEqual({ status: "failed" });
	});

	it("an existing backup survives when the next one fails", () => {
		const source = openSource(4);
		const files = nodeFiles(path.join(dir, "backups"));
		backupBeforeMigrating(source, () => files, T0);
		backupBeforeMigrating(
			{
				...source,
				runSync: () => {
					throw new Error("boom");
				},
			},
			() => files,
			T0 + 60_000,
		);
		expect(files.names()).toEqual([backupName(4, T0)]);
	});
});
