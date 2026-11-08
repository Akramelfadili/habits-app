import { log } from "@/lib/logger/logger";
import { errorMessageOf, errorNameOf } from "./error-name";

/**
 * What this launch has to do with the stored database (SY3, audit C-03, C-07).
 * Read before the migrator runs — nothing here writes.
 *
 * - "fresh": a genuinely empty database (no tables, or only an empty
 *   migrations table). Nothing to move, nothing to lose.
 * - "current": every migration this build ships is applied.
 * - "upgrade": an older migration is the last applied one. The update screen
 *   shows, and a backup is taken first.
 * - "newer": the last applied migration is newer than any this build ships —
 *   the data was written by a newer version of the app. This build must not
 *   touch it.
 * - "unreadable": the migrations table could not be read for a reason other
 *   than not existing (a corrupt file, an I/O error), or the database holds
 *   tables but no migration record. The migrator must not run on it.
 *
 * The upgrade test is the migrator's own: `created_at` of the last applied row
 * against each journal entry's `when`.
 */
export type MigrationPlan =
	| "fresh"
	| "current"
	| "upgrade"
	| "newer"
	| "unreadable";

/** The slice of expo-sqlite's database the check reads. */
type SyncReader = {
	getFirstSync: <Row>(source: string) => Row | null;
};

/**
 * Long enough for the update screen to be painted before the migrator takes the
 * JavaScript thread (it runs every statement in one synchronous loop), short
 * enough that nobody notices. Only waited for on an upgrade.
 */
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
		// Only a missing table means "never migrated". A corrupt file or an I/O
		// error must not be mistaken for a first install.
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

/** Tables the app owns, with no record of how they got there: not a first install. */
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
