import { QUICK_ADD_STEPS } from "../constants";

export type QuickAddChip =
	| { kind: "add"; amount: number; label: string }
	| { kind: "fill"; amount: number };

// A step equal to the target is skipped: "+1" and "Fill to 1" would be the same action shown twice.
export function quickAddChips(targetAmount: number): QuickAddChip[] {
	const chips: QuickAddChip[] = QUICK_ADD_STEPS.filter(
		(step) => step < targetAmount,
	).map((step) => ({ kind: "add", amount: step, label: `+${step}` }));
	chips.push({ kind: "fill", amount: targetAmount });
	return chips;
}
