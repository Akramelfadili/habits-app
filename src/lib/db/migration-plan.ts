/**
 * Whether this launch has stored habits to migrate (SY3). The screen is only
 * for an update: a fresh install has nothing to move, and an up-to-date
 * database finishes before anyone could read it.
 *
 * "fresh": no migration has ever been recorded. "current": every migration the
 * app ships is applied. "upgrade": an older one is the last applied. The test is
 * the migrator's own (`created_at` of the last applied row against each
 * journal's `when`), read before the migrator runs — nothing here writes.
 */
export type MigrationPlan = "fresh" | "current" | "upgrade";

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

export function planMigrations(
	database: SyncReader,
	newestMigrationAt: number,
): MigrationPlan {
	let last: { created_at: number | string } | null;
	try {
		last = database.getFirstSync<{ created_at: number | string }>(
			"SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1",
		);
	} catch {
		// No migrations table: a database that has never been migrated.
		return "fresh";
	}
	if (!last) return "fresh";
	return Number(last.created_at) < newestMigrationAt ? "upgrade" : "current";
}
