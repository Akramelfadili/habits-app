import { log } from "@/lib/logger/logger";
import { errorMessageOf, errorNameOf } from "./error-name";

// "newer": the data was written by a newer build, which this one must not touch. "unreadable": a
// corrupt file or I/O error, or tables without a migration record; the migrator must not run on it.
// The upgrade test is the migrator's own: last applied `created_at` against each journal `when`.
export type MigrationPlan =
	| "fresh"
	| "current"
	| "upgrade"
	| "newer"
	| "unreadable";

type SyncReader = {
	getFirstSync: <Row>(source: string) => Row | null;
};

// Long enough for the update screen to paint before the migrator takes the JS thread (one synchronous loop).
export const MIGRATION_SCREEN_PAINT_MS = 100;

const NO_MIGRATIONS_TABLE = /no such table/i;

export function planMigrations(
	database: SyncReader,
	newestMigrationAt: number,
): MigrationPlan {
	let last: { created_at: number | string } | null;
	try {
		last = database.getFirstSync<{ created_at: number | string }>(
			"SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1",
		);
	} catch (error) {
		// Only a missing table means "never migrated"; a corrupt file or I/O error is not a first install.
		if (!NO_MIGRATIONS_TABLE.test(errorMessageOf(error))) {
			return unreadable(error);
		}
		last = null;
	}
	if (!last) return hasOtherTables(database) ? "unreadable" : "fresh";
	return Number(last.created_at) < newestMigrationAt
		? "upgrade"
		: Number(last.created_at) > newestMigrationAt
			? "newer"
			: "current";
}

function hasOtherTables(database: SyncReader): boolean {
	try {
		const row = database.getFirstSync<{ n: number }>(
			"SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations'",
		);
		if (Number(row?.n ?? 0) > 0) {
			log.error("migration.plan_unreadable", { reason: "untracked_tables" });
			return true;
		}
		return false;
	} catch (error) {
		unreadable(error);
		return true;
	}
}

function unreadable(error: unknown): "unreadable" {
	log.error("migration.plan_unreadable", {
		errorName: errorNameOf(error),
	});
	return "unreadable";
}
