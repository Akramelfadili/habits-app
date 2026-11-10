import { sql } from "drizzle-orm";
import { log } from "@/lib/logger/logger";
import { db } from "./client";

// A rollback can itself throw; if that error replaced the one being handled the original cause
// would be lost, so it is logged and swallowed.
export async function rollbackQuietly(): Promise<void> {
	try {
		await db.run(sql`rollback`);
	} catch (error) {
		log.error("database.rollback_failed", { error });
	}
}

let queue: Promise<unknown> = Promise.resolve();

// Not Drizzle's `db.transaction()`: its expo-sqlite implementation commits when the callback
// returns, which for an async callback is at the first `await`. Runs are serialised: a second
// `begin` on the one connection would fail, and its catch would roll back the *first* run.
// `work` must not call `runInTransaction` itself.
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
	// Only keeps the queue running after a failure; the caller still gets the rejection through `next`.
	queue = next.catch(() => undefined);
	return next;
}
