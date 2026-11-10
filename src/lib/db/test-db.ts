/// <reference types="node" />
// Node ambient types are scoped to this file; tsconfig's `types: ["jest"]` keeps them out of app code.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

// expo-sqlite's native binding doesn't run under Jest, so tests swap `lib/db/client`'s `db` for
// one built on `node:sqlite` instead of mocking query behaviour away.
export function createTestDb({
	foreignKeys = true,
	onWrite,
}: {
	// Off reproduces the device: expo-sqlite leaves foreign keys unenforced.
	foreignKeys?: boolean;
	onWrite?: (table: string) => void;
} = {}) {
	const sqlite = new DatabaseSync(":memory:", {
		enableForeignKeyConstraints: foreignKeys,
	});
	applyMigrations(sqlite, migrationTags());
	return wrap(sqlite, onWrite);
}

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

// Mirrors the device: all pending migrations in one BEGIN…COMMIT. Inside a transaction
// `PRAGMA foreign_keys` is a no-op, so a migration relying on it would only pass outside one.
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

const WRITE_STATEMENT =
	/^\s*(?:insert\s+into|update|delete\s+from)\s+"?(\w+)"?/i;

function wrap(sqlite: DatabaseSync, onWrite?: (table: string) => void) {
	return drizzle(
		async (sqlText, params, method) => {
			const statement = sqlite.prepare(sqlText);
			const written = WRITE_STATEMENT.exec(sqlText)?.[1];
			if (written && onWrite) {
				queueMicrotask(() => onWrite(written));
			}

			if (method === "run") {
				statement.run(...params);
				return { rows: [] };
			}

			// Positional rows: keyed objects would collapse a join's same-named columns.
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

// A normal create always uses "now", which would put a backdated entry before the habit existed.
export async function backdateHabit(
	db: { update: ReturnType<typeof createTestDb>["update"] },
	habitId: number,
	createdAt: Date,
) {
	await db
		.update(schema.habits)
		.set({ createdAt })
		.where(eq(schema.habits.id, habitId));
}
