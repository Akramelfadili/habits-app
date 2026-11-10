/**
 * Helpers for `noUncheckedIndexedAccess` (tsconfig.strict.json): a lookup the
 * caller knows succeeds, narrowed with a loud failure at the lookup instead of
 * an `undefined` surfacing somewhere else.
 */

/**
 * The item at `index` of a list the caller built to be long enough (a grid
 * row, cells aligned with a date list). Throws a `RangeError` with the index
 * if an off-by-one ever breaks the alignment.
 */
export function atIndex<T>(items: readonly T[], index: number): T {
	const item = items[index];
	if (item === undefined) {
		throw new RangeError(
			`No item at index ${index} (length ${items.length}); the list should be aligned by construction.`,
		);
	}
	return item;
}

/**
 * A value that must exist, e.g. the row an `INSERT ... RETURNING` or an
 * `UPDATE` of a row just checked gives back. `what` names it in the error.
 */
export function present<T>(item: T | undefined, what: string): T {
	if (item === undefined) throw new Error(`Expected ${what}, got nothing.`);
	return item;
}
