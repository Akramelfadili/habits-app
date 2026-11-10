import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { type DependencyList, useRef } from "react";
import { log } from "@/lib/logger/logger";

const NO_ROWS: never[] = [];

type LiveQuery = Parameters<typeof useLiveQuery>[0];

type UseLiveRowsOptions = {
	// On for one entity's rows (a habit's reminders) so the previous entity's rows never show under
	// the new one; off for a range or date so nothing flashes blank while the next result loads.
	resetOnDepsChange?: boolean;
};

function sameDeps(a: DependencyList, b: DependencyList): boolean {
	return a.length === b.length && a.every((dep, i) => Object.is(dep, b[i]));
}

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

// A query error is logged once and thrown into the root ErrorBoundary: Drizzle only stores it,
// so without this the screen would sit on `[]` forever.
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
