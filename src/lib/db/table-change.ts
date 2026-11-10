import { addDatabaseChangeListener } from "expo-sqlite";

/**
 * Calls `listener` after every write to `table`, until the returned function is
 * called. The same signal Drizzle's `useLiveQuery` listens to (needs
 * `enableChangeListener` in `client.ts`), for the shared live tables that read
 * outside a hook (`shared-live-table.ts`). Jest swaps this for the live-query
 * stand-in's notifier (`jest.setup.js`), since the native listener does not run
 * there.
 */
export function onTableChange(table: string, listener: () => void): () => void {
	const subscription = addDatabaseChangeListener(({ tableName }) => {
		if (tableName === table) listener();
	});
	return () => subscription.remove();
}
