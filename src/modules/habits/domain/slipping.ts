// Shared by the rows and the insights so a habit tagged "slipping" is the one the card names.

export const SLIPPING_MIN_DROP_POINTS = 25;

export const SLIPPING_MIN_DUE = { week: 3, year: 30 } as const;

export function isSlippingVsPrevious(
	kind: keyof typeof SLIPPING_MIN_DUE,
	row: {
		due: number;
		rate: number | null;
		previousRate: number | null;
		previous: { due: number };
	},
): boolean {
	if (row.rate === null || row.previousRate === null) return false;
	// Both ranges need a real sample: one done day last week is not a 100 % habit.
	if (row.due < SLIPPING_MIN_DUE[kind]) return false;
	if (row.previous.due < SLIPPING_MIN_DUE[kind]) return false;
	return row.previousRate - row.rate >= SLIPPING_MIN_DROP_POINTS;
}
