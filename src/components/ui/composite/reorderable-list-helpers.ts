/**
 * Pure move math for `ReorderableList`. The functions the drag gesture calls on the UI thread are
 * marked as worklets; they also run as plain functions (tests, the accessibility Move up/down path).
 */

export function groupBounds(
	groups: readonly string[],
	index: number,
): [number, number] {
	"worklet";
	let start = index;
	while (start > 0 && groups[start - 1] === groups[index]) start -= 1;
	let end = index;
	while (end < groups.length - 1 && groups[end + 1] === groups[index]) end += 1;
	return [start, end];
}

/**
 * Where a row dragged from `from` by `translationY` would land: it passes a
 * neighbour once it's covered more than half that neighbour's height, and
 * never leaves `bounds` (its own group).
 */
export function dragTargetIndex(
	from: number,
	translationY: number,
	heights: readonly number[],
	bounds: readonly [number, number],
): number {
	"worklet";
	let target = from;
	let remaining = translationY;
	if (remaining > 0) {
		for (let i = from + 1; i <= bounds[1]; i += 1) {
			const height = heights[i] ?? 0;
			if (remaining <= height / 2) break;
			target = i;
			remaining -= height;
		}
	} else {
		for (let i = from - 1; i >= bounds[0]; i -= 1) {
			const height = heights[i] ?? 0;
			if (-remaining <= height / 2) break;
			target = i;
			remaining += height;
		}
	}
	return target;
}

export function offsetBetween(
	from: number,
	to: number,
	heights: readonly number[],
): number {
	"worklet";
	if (from === to) return 0;
	let offset = 0;
	for (let i = Math.min(from, to) + 1; i <= Math.max(from, to); i += 1) {
		offset += heights[to > from ? i : i - 1] ?? 0;
	}
	return to > from ? offset : -offset;
}

export function moveItem<T>(
	items: readonly T[],
	from: number,
	to: number,
): T[] {
	const next = [...items];
	next.splice(to, 0, ...next.splice(from, 1));
	return next;
}

/** How long a dropped or displaced row takes to settle; none with Reduce Motion on. */
const SETTLE_MS = 150;

export function settleDuration(reducedMotion: boolean): number {
	return reducedMotion ? 0 : SETTLE_MS;
}
