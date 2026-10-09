import journal from "./migrations/meta/_journal.json";

/** How many migrations ship in this build — the database's schema version once they have all run. */
export const SCHEMA_VERSION: number = journal.entries.length;
