import journal from "./migrations/meta/_journal.json";

export const SCHEMA_VERSION: number = journal.entries.length;
