import { QUICK_ADD_STEPS } from "../constants";
import type { Frequency } from "../types";

/** The sheet header's cadence word, e.g. "Target 8 glasses · daily" (HAB-07). */
export function frequencySummary(frequency: Frequency): string {
	switch (frequency.type) {
		case "weekdays":
			return "on selected weekdays";
		case "per-week":
			return `${frequency.timesPerWeek}x per week`;
		default:
			return "daily";
	}
}

export type QuickAddChip =
	| { kind: "add"; amount: number; label: string }
	| { kind: "set"; amount: number; label: string };

/**
 * Quick-add chips — the small +1/+2 increments, plus a "Full {target}" chip
 * that jumps straight to the target rather than adding to it, per the feature
 * spec's own example ("+1", "+2", "Full 8"). Skips a step that already equals
 * the target (e.g. a target of 1 or 2), since "+1" and "Full 1" would be the
 * same action shown twice.
 */
export function quickAddChips(targetAmount: number): QuickAddChip[] {
	const chips: QuickAddChip[] = QUICK_ADD_STEPS.filter(
		(step) => step < targetAmount,
	).map((step) => ({ kind: "add", amount: step, label: `+${step}` }));
	chips.push({
		kind: "set",
		amount: targetAmount,
		label: `Full ${targetAmount}`,
	});
	return chips;
}
