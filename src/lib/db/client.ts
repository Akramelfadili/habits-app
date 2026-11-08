import { drizzle } from "drizzle-orm/expo-sqlite";
import {
	defaultDatabaseDirectory,
	openDatabaseSync,
	type SQLiteDatabase,
} from "expo-sqlite";
import { log } from "@/lib/logger/logger";
import { utcStamp } from "./database-backup";
import { renameDatabaseFile } from "./database-files";
import * as schema from "./schema";

const DATABASE_NAME = "habits.db";

type Db = ReturnType<typeof drizzle<typeof schema>>;

/** Stands in for a database that could not be opened: any use fails loudly. */
function unusable<T extends object>(): T {
	return new Proxy({} as T, {
		get() {
			throw new Error("the database is not open");
		},
	});
}

let openError: unknown = null;

function open(): { expoDb: SQLiteDatabase; db: Db } {
	try {
		const sqlite = openDatabaseSync(DATABASE_NAME, {
			enableChangeListener: true,
		});
		openError = null;
		return { expoDb: sqlite, db: drizzle(sqlite, { schema }) };
	} catch (error) {
		// Opening runs at import, before any screen exists. Throwing here would
		// crash before any UI, so keep the failure: `DatabaseProvider` shows the
		// recovery screen (with Copy diagnostics) and never reads these two.
		openError = error;
		log.error("database.open_failed", { error });
		return { expoDb: unusable<SQLiteDatabase>(), db: unusable<Db>() };
	}
}

const first = open();

// `let` exports are live bindings: a successful `retryOpenDatabase` swaps them
// for every importer.
export let expoDb: SQLiteDatabase = first.expoDb;
export let db: Db = first.db;

/** The error from the last open attempt, or null when the database is open. */
export function getDatabaseOpenError(): unknown {
	return openError;
}

/** Tries to open again (the recovery screen's Try again). */
export function retryOpenDatabase(): void {
	if (openError === null) return;
	const next = open();
	expoDb = next.expoDb;
	db = next.db;
}

/**
 * Recovery from a database that will not open or migrate (audit C-03): closes
 * it, renames `habits.db` (and its companions) to `habits.corrupt-<timestamp>.db`
 * in the same folder, and opens a new empty one. The old file is never deleted,
 * so a later build or support can still read it. If the rename fails the
 * original is opened again and the error is thrown: nothing changed.
 */
export function setAsideDatabase(now: number): void {
	const wasOpen = openError === null;
	if (wasOpen) expoDb.closeSync();
	try {
		renameDatabaseFile(
			`${defaultDatabaseDirectory}/${DATABASE_NAME}`,
			`habits.corrupt-${utcStamp(now)}.db`,
		);
	} catch (error) {
		const original = open();
		expoDb = original.expoDb;
		db = original.db;
		throw error;
	}
	log.warn("database.set_aside");
	const fresh = open();
	expoDb = fresh.expoDb;
	db = fresh.db;
}
