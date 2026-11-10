import { useRef, useSyncExternalStore } from "react";
import { log } from "@/lib/logger/logger";
import { onTableChange } from "./table-change";

// Drizzle's `useLiveQuery` is one query and listener per hook call; with all tabs mounted that was
// a dozen re-reads of one table per write. Here one subscription is shared (reference counted).
// Unchanged rows keep their previous objects, so a write leaves slices that don't contain it equal.

export type SharedSnapshot<Row> = {
	rows: Row[];
	loaded: boolean;
	error: unknown;
};

export type SharedLiveTable<Row> = {
	subscribe(listener: () => void): () => void;
	getSnapshot(): SharedSnapshot<Row>;
};

type Definition<Source, Row> = {
	table: string;
	read: () => PromiseLike<Source[]>;
	map: (source: Source) => Row;
	key: (row: Row) => number | string;
	same: (a: Row, b: Row) => boolean;
};

const EMPTY = { loaded: false, error: undefined } as const;

export function createSharedLiveTable<Source, Row>({
	table,
	read,
	map,
	key,
	same,
}: Definition<Source, Row>): SharedLiveTable<Row> {
	const listeners = new Set<() => void>();
	let snapshot: SharedSnapshot<Row> = { rows: [], ...EMPTY };
	let stopListening: (() => void) | undefined;
	// A result that is not the latest read of the current subscription is dropped, so a late one
	// after the last unmount can't leak into the next subscription.
	let latest = 0;

	function publish(next: SharedSnapshot<Row>) {
		snapshot = next;
		for (const listener of [...listeners]) listener();
	}

	function reconcile(rows: Row[]): Row[] {
		if (!snapshot.loaded) return rows;
		const previous = new Map(snapshot.rows.map((row) => [key(row), row]));
		let unchanged = rows.length === snapshot.rows.length;
		const merged = rows.map((row, index) => {
			const before = previous.get(key(row));
			const kept = before !== undefined && same(before, row) ? before : row;
			if (kept !== snapshot.rows[index]) unchanged = false;
			return kept;
		});
		return unchanged ? snapshot.rows : merged;
	}

	function refresh() {
		const ticket = ++latest;
		read().then(
			(sources) => {
				if (ticket !== latest) return;
				const rows = reconcile(sources.map(map));
				if (snapshot.loaded && rows === snapshot.rows) return;
				publish({ rows, loaded: true, error: undefined });
			},
			(error: unknown) => {
				if (ticket !== latest) return;
				publish({ rows: [], loaded: false, error });
			},
		);
	}

	function start() {
		stopListening = onTableChange(table, refresh);
		refresh();
	}

	function stop() {
		stopListening?.();
		stopListening = undefined;
		latest += 1;
		snapshot = { rows: [], ...EMPTY };
	}

	return {
		subscribe(listener) {
			listeners.add(listener);
			if (listeners.size === 1) start();
			return () => {
				listeners.delete(listener);
				if (listeners.size === 0) stop();
			};
		},
		getSnapshot: () => snapshot,
	};
}

type Selection<Slice> = { snapshot: unknown; select: unknown; slice: Slice };

// `select` must be stable between renders (`useCallback`): a new function is a new question and
// is asked again. A failed read is logged once and thrown into the ErrorBoundary.
export function useSharedLiveTable<Row, Slice>(
	source: SharedLiveTable<Row>,
	select: (rows: Row[]) => Slice,
	isEqual: (a: Slice, b: Slice) => boolean = Object.is,
): Slice {
	const last = useRef<Selection<Slice> | null>(null);
	const getSlice = (): Slice => {
		const snapshot = source.getSnapshot();
		const known = last.current;
		if (known && known.snapshot === snapshot && known.select === select) {
			return known.slice;
		}
		let slice = select(snapshot.rows);
		if (known && isEqual(known.slice, slice)) slice = known.slice;
		last.current = { snapshot, select, slice };
		return slice;
	};
	const slice = useSyncExternalStore(source.subscribe, getSlice, getSlice);

	const { error } = source.getSnapshot();
	if (error) {
		const normalized =
			error instanceof Error ? error : new Error(String(error));
		log.error("livequery.failed", { error: normalized });
		throw normalized;
	}
	return slice;
}

export function sameElements<T>(a: readonly T[], b: readonly T[]): boolean {
	return a.length === b.length && a.every((item, index) => item === b[index]);
}
