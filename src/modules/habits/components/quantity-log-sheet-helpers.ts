import { QUICK_ADD_STEPS } from "../constants";

export type QuickAddChip =
	| { kind: "add"; amount: number; label: string }
	| { kind: "fill"; amount: number };

/**
 * Quick-add chips (QS1) — the +1/+2/+3 increments, plus a Fill-to-target chip
 * that jumps straight to the target rather than adding to it (its label is
 * `messages.ts`'s). Skips a step that already equals the target (a target of 1,
 * 2 or 3), since "+1" and "Fill to 1" would be the same action shown twice.
 */
export function quickAddChips(targetAmount: number): QuickAddChip[] {
	const chips: QuickAddChip[] = QUICK_ADD_STEPS.filter(
		(step) => step < targetAmount,
	).map((step) => ({ kind: "add", amount: step, label: `+${step}` }));
	chips.push({ kind: "fill", amount: targetAmount });
	return chips;
}
