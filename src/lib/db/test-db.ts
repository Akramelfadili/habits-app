/// <reference types="node" />
// Node ambient types are scoped to this file (tsconfig's `types: ["jest"]` keeps
// them out of app code) — this file only ever runs under Jest, never bundled.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

/**
 * A real, migrated, in-memory SQLite database for repository tests — expo-sqlite's
 * native binding doesn't run under Jest, so tests swap `lib/db/client`'s `db`
 * for one built here (Node's built-in `node:sqlite`, no native compile step)
 * instead of mocking query behavior away.
 */
export function createTestDb() {
	const sqlite = new DatabaseSync(":memory:");

	const migrationsDir = path.join(__dirname, "migrations");
	const journal = JSON.parse(
		fs.readFileSync(path.join(migrationsDir, "meta/_journal.json"), "utf8"),
	);
	for (const entry of journal.entries) {
		sqlite.exec(
			fs.readFileSync(path.join(migrationsDir, `${entry.tag}.sql`), "utf8"),
		);
	}

	return drizzle(
		async (sqlText, params, method) => {
			const statement = sqlite.prepare(sqlText);

			if (method === "run") {
				statement.run(...params);
				return { rows: [] };
			}

			if (method === "get") {
				const row = statement.get(...params);
				return { rows: row ? Object.values(row) : [] };
			}

			const rows = statement.all(...params);
			return {
				rows: rows.map((row) => Object.values(row as Record<string, unknown>)),
			};
		},
		{ schema },
	);
}
