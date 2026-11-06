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
		log.error("database.rollback_failed", { error });
	}
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Runs `work` between a raw `begin` and `commit`, rolling back if it throws.
 * Awaited statements, not Drizzle's `db.transaction()`: that helper's
 * expo-sqlite implementation commits as soon as its callback returns, which
 * for an async callback is at the first `await`.
 *
 * Runs are serialised: a second `begin` on the one connection would fail with
 * "cannot start a transaction within a transaction", and its catch would roll
 * back the *first* run. Two taps in quick succession wait for each other
 * instead. `work` must not call `runInTransaction` itself.
 */
export function runInTransaction<T>(work: () => Promise<T>): Promise<T> {
	const execute = async () => {
		await db.run(sql`begin`);
		try {
			const result = await work();
			await db.run(sql`commit`);
			return result;
		} catch (error) {
			await rollbackQuietly();
			throw error;
		}
	};
	const next = queue.then(execute, execute);
	queue = next.catch(() => undefined);
	return next;
}
