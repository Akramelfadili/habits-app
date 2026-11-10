import { getTableName, is } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { useEffect, useState } from "react";

/**
 * Jest stand-in for `drizzle-orm/expo-sqlite`'s `useLiveQuery`. The real hook
 * needs expo-sqlite's change listener, which doesn't run under Jest, so this
 * keeps its contract instead: `data` starts empty and `updatedAt` undefined
 * until the first result, the query is (re)run only when `deps` change — the
 * `deps = []` default means "once", exactly like the real hook — and again
 * whenever its own `from` table is reported changed via `notifyTableChanged`.
 */
const listeners = new Set<(table: string) => void>();

export function notifyTableChanged(table: string) {
	for (const listener of listeners) listener(table);
}

/** Stand-in for `table-change.ts`: `listener` runs after each reported write to `table`. */
export function onTableChange(table: string, listener: () => void) {
	const own = (changed: string) => {
		if (changed === table) listener();
	};
	listeners.add(own);
	return () => {
		listeners.delete(own);
	};
}

/** How many live subscriptions are open right now — hooks and shared tables alike. */
export function activeListenerCount(): number {
	return listeners.size;
}

export function useLiveQuery(
	query: PromiseLike<unknown[]> & { config: { table: unknown } },
	deps: readonly unknown[] = [],
) {
	const [result, setResult] = useState<{
		data: unknown[];
		updatedAt: Date | undefined;
	}>({ data: [], updatedAt: undefined });
	useEffect(() => {
		const table = query.config.table;
		const name = is(table, SQLiteTable) ? getTableName(table) : "";
		let current = true;
		const run = () => {
			query.then((data) => {
				if (current) setResult({ data, updatedAt: new Date() });
			});
		};
		const listener = (changed: string) => {
			if (changed === name) run();
		};
		run();
		listeners.add(listener);
		return () => {
			current = false;
			listeners.delete(listener);
		};
		// biome-ignore lint/correctness/useExhaustiveDependencies: `deps` is the caller's contract, as in the real hook
	}, deps);
	return result;
}
