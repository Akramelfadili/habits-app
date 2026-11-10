// A loud failure at the lookup instead of an `undefined` surfacing somewhere else.

export function atIndex<T>(items: readonly T[], index: number): T {
	const item = items[index];
	if (item === undefined) {
		throw new RangeError(
			`No item at index ${index} (length ${items.length}); the list should be aligned by construction.`,
		);
	}
	return item;
}

export function present<T>(item: T | undefined, what: string): T {
	if (item === undefined) throw new Error(`Expected ${what}, got nothing.`);
	return item;
}
