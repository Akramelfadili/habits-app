import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import { log } from "@/lib/logger/logger";
import * as schema from "./schema";

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
		const sqlite = openDatabaseSync("habits.db", {
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
