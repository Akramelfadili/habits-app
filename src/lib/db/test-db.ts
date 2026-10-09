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
export function createTestDb({
	foreignKeys = true,
}: {
	/** Off reproduces the device: expo-sqlite leaves foreign keys unenforced. */
	foreignKeys?: boolean;
} = {}) {
	const sqlite = new DatabaseSync(":memory:", {
		enableForeignKeyConstraints: foreignKeys,
	});
	applyMigrations(sqlite, migrationTags());
	return wrap(sqlite);
}

/**
 * A raw in-memory database migrated only up to (not including) `stopBefore` —
 * for testing a data migration against rows written in the old shape.
 * `migrateRest()` then applies every remaining migration.
 */
export function createPartiallyMigratedTestDb(
	stopBefore: string,
	{ foreignKeys = true }: { foreignKeys?: boolean } = {},
) {
	const sqlite = new DatabaseSync(":memory:", {
		enableForeignKeyConstraints: foreignKeys,
	});
	const tags = migrationTags();
	const stopAt = tags.findIndex((tag) => tag.startsWith(stopBefore));
	if (stopAt === -1) throw new Error(`No migration "${stopBefore}"`);
	applyMigrations(sqlite, tags.slice(0, stopAt));
	return {
		sqlite,
		migrateRest: () => applyMigrations(sqlite, tags.slice(stopAt)),
	};
}

const migrationsDir = path.join(__dirname, "migrations");

function migrationTags(): string[] {
	const journal = JSON.parse(
		fs.readFileSync(path.join(migrationsDir, "meta/_journal.json"), "utf8"),
	);
	return journal.entries.map((entry: { tag: string }) => entry.tag);
}

/**
 * Applies migrations the way drizzle's expo migrator does on device: every
 * pending one inside a single BEGIN…COMMIT, statement by statement. That
 * matters — inside a transaction `PRAGMA foreign_keys` is a no-op, so a
 * migration relying on it would only pass here if run outside one.
 * (node:sqlite enforces foreign keys by default; expo-sqlite doesn't.)
 */
function applyMigrations(sqlite: DatabaseSync, tags: string[]) {
	sqlite.exec("BEGIN");
	try {
		for (const tag of tags) {
			const file = fs.readFileSync(
				path.join(migrationsDir, `${tag}.sql`),
				"utf8",
			);
			for (const statement of file.split("--> statement-breakpoint")) {
				if (statement.trim()) sqlite.exec(statement);
			}
		}
		sqlite.exec("COMMIT");
	} catch (err) {
		sqlite.exec("ROLLBACK");
		throw err;
	}
}

function wrap(sqlite: DatabaseSync) {
	return drizzle(
		async (sqlText, params, method) => {
			const statement = sqlite.prepare(sqlText);

			if (method === "run") {
				statement.run(...params);
				return { rows: [] };
			}

			// Positional rows, as the sqlite-proxy driver expects — keyed objects
			// would collapse a join's same-named columns (both tables' `id`).
			statement.setReturnArrays(true);

			if (method === "get") {
				return {
					rows: (statement.get(...params) as unknown as unknown[]) ?? [],
				};
			}

			return { rows: statement.all(...params) as unknown as unknown[][] };
		},
		{ schema },
	);
}
