/**
 * The item at `index` of a list the caller built to be long enough (a grid
 * row, cells aligned with a date list). `noUncheckedIndexedAccess` types a
 * plain `items[index]` as possibly `undefined`; this narrows it and fails at
 * the lookup, with the index in the message, if an off-by-one ever breaks the
 * alignment, instead of as `undefined.status` somewhere else.
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
