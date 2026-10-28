import { format } from "date-fns";
import { isDayLogValueDone } from "../domain/retro-log";
import type { DayLogValue, Habit } from "../types";

/** The sheet's title — "Tuesday, 8 September" (docs/mockups/retro-log.png). */
export function retroLogTitle(date: Date): string {
	return format(date, "EEEE, d MMMM");
}

/**
 * A row's subtitle. Quantity habits show their target ("8 glasses") when
 * nothing or exactly the target is logged, and the exact amount otherwise
 * ("6 of 8 glasses"). A resisted Break habit says so (HAB-04's framing);
 * other check habits show their category (every habit has one, HAB-24).
 */
export function retroLogRowSubtitle(habit: Habit, value: DayLogValue): string {
	if (habit.targetType === "quantity") {
		const target = habit.targetAmount ?? 0;
		const unit = habit.targetUnit ?? "";
		const amount = typeof value === "number" ? value : 0;
		return (
			amount === 0 || amount === target
				? `${target} ${unit}`
				: `${amount} of ${target} ${unit}`
		).trim();
	}
	if (habit.direction === "break" && isDayLogValueDone(habit, value)) {
		return "Resisted";
	}
	return habit.category.name;
}
