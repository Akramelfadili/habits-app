import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { type DependencyList, useRef } from "react";
import { log } from "@/lib/logger/logger";

const NO_ROWS: never[] = [];

type LiveQuery = Parameters<typeof useLiveQuery>[0];

type UseLiveRowsOptions = {
	/**
	 * For a query keyed to one entity (a habit's reminders): when `deps` change,
	 * report not-loaded and no rows until the new entity's first result, so the
	 * previous entity's rows never show under the new one. Leave off for a range
	 * or a date (week navigation, day rollover): the previous rows stay on screen
	 * until the next result arrives, so nothing flashes blank.
	 */
	resetOnDepsChange?: boolean;
};

function sameDeps(a: DependencyList, b: DependencyList): boolean {
	return a.length === b.length && a.every((dep, i) => Object.is(dep, b[i]));
}

/**
 * Drizzle's `useLiveQuery` only looks at the query again when `deps` change, so a query given
 * as a function is built once per deps, not once per render. A query object passed directly is
 * used as it is.
 */
function useBuiltQuery(
	query: LiveQuery | (() => LiveQuery),
	deps: DependencyList,
): LiveQuery {
	const built = useRef<{ deps: DependencyList; query: LiveQuery } | null>(null);
	if (typeof query !== "function") return query;
	if (!built.current || !sameDeps(built.current.deps, deps)) {
		built.current = { deps: [...deps], query: query() };
	}
	return built.current.query;
}

/**
 * The one wrapper over Drizzle's `useLiveQuery`:
 * - `loaded` turns true with the first result and stays true across deps changes (see
 *   `resetOnDepsChange`), so screens can hold a neutral blank instead of flashing an empty state;
 * - a query error is logged once and thrown, which lands in the root ErrorBoundary as a last
 *   resort: "Try again" remounts the screens, and the new subscription re-runs the query. Drizzle
 *   itself only stores it, so without this the screen would sit on `[]` forever.
 */
export function useLiveRows<Row>(
	query: LiveQuery | (() => LiveQuery),
	deps: DependencyList = [],
	{ resetOnDepsChange = false }: UseLiveRowsOptions = {},
): { data: Row[]; loaded: boolean } {
	const live = useBuiltQuery(query, deps);
	const { data, error, updatedAt } = useLiveQuery(live, deps as unknown[]);

	const key = resetOnDepsChange ? JSON.stringify(deps) : "";
	const baseline = useRef<{ key: string; updatedAt: Date | undefined }>({
		key,
		updatedAt: undefined,
	});
	if (resetOnDepsChange && baseline.current.key !== key) {
		baseline.current = { key, updatedAt };
	}

	if (error) {
		const normalized =
			error instanceof Error ? error : new Error(String(error));
		log.error("livequery.failed", { error: normalized });
		throw normalized;
	}

	const loaded =
		updatedAt !== undefined &&
		(!resetOnDepsChange || updatedAt !== baseline.current.updatedAt);
	return { data: loaded ? ((data ?? NO_ROWS) as Row[]) : NO_ROWS, loaded };
}
