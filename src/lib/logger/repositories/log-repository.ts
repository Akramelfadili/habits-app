import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import type { LogEntry } from "../types";

/**
 * The persistent log: a SEPARATE small SQLite file (`logs.db`), not the habits
 * database — no migration of the main schema, and a log write can never wait
 * behind, or break, a habit write. It is a plain ring: `append` trims to the
 * newest `keep` rows in the same transaction. Raw SQL on purpose (one table,
 * no schema to evolve); it never goes through Drizzle or `lib/db/client`.
 */

const FILE = "logs.db";

let database: SQLiteDatabase | undefined;

function open(): SQLiteDatabase {
	if (!database) {
		const opened = openDatabaseSync(FILE);
		opened.execSync(
			"CREATE TABLE IF NOT EXISTS log_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, entry TEXT NOT NULL)",
		);
		database = opened;
	}
	return database;
}

export async function appendLogEntries(
	entries: readonly LogEntry[],
	keep: number,
): Promise<void> {
	if (entries.length === 0) return;
	const db = open();
	await db.withTransactionAsync(async () => {
		for (const entry of entries) {
			await db.runAsync(
				"INSERT INTO log_entries (entry) VALUES (?)",
				JSON.stringify(entry),
			);
		}
		await db.runAsync(
			"DELETE FROM log_entries WHERE id <= (SELECT MAX(id) FROM log_entries) - ?",
			keep,
		);
	});
}

export async function readLogEntries(): Promise<LogEntry[]> {
	const rows = await open().getAllAsync<{ entry: string }>(
		"SELECT entry FROM log_entries ORDER BY id ASC",
	);
	const entries: LogEntry[] = [];
	for (const row of rows) {
		try {
			entries.push(JSON.parse(row.entry) as LogEntry);
		} catch {
			// A damaged row must not hide the rest.
		}
	}
	return entries;
}

export async function clearLogEntries(): Promise<void> {
	await open().runAsync("DELETE FROM log_entries");
}
