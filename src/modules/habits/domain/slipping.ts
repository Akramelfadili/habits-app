/**
 * "Slipping" and "improved" thresholds shared by the per-habit rows and the
 * insights (V3-3a), so a habit tagged "slipping" in the list is the one the
 * insight card names. Month's slipping is its weekly trend
 * (`monthly-insights.ts`); Week and Year compare with the previous range.
 */

/** Whole points a habit must fall on the previous range to be slipping. */
export const SLIPPING_MIN_DROP_POINTS = 25;

/** Due days the range needs before it can call a habit slipping, by scale. */
export const SLIPPING_MIN_DUE = { week: 3, year: 30 } as const;

export function isSlippingVsPrevious(
	kind: keyof typeof SLIPPING_MIN_DUE,
	row: { due: number; rate: number | null; previousRate: number | null },
): boolean {
	if (row.rate === null || row.previousRate === null) return false;
	if (row.due < SLIPPING_MIN_DUE[kind]) return false;
	return row.previousRate - row.rate >= SLIPPING_MIN_DROP_POINTS;
}
