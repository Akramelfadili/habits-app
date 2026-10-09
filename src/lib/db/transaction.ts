import { sql } from "drizzle-orm";
import { log } from "@/lib/logger/logger";
import { db } from "./client";

/**
 * Ends a failed raw `begin … commit` block. A rollback can itself throw (the
 * connection is gone, the transaction already ended); if that error replaced
 * the one being handled, the original cause would be lost — so it is logged
 * and swallowed, and the caller rethrows its own error (audit A3-11).
 */
export async function rollbackQuietly(): Promise<void> {
	try {
		await db.run(sql`rollback`);
	} catch (error) {
		log.error("db", "rollback failed", error);
	}
}
