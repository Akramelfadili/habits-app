import { isDayLogValueDone } from "../domain/retro-log";
import { todayCopy } from "../messages";
import type { DayLogValue, Habit } from "../types";
import type { RowStatus } from "./today-row-status";

/**
 * The line under a habit's name in Edit this day (RL1/RL2): what that day holds
 * and what a tap does. A frozen day says logging it gives the freeze back
 * (PR-11); a quantity habit says the circle opens the amount.
 */
export function editDayRowStatus(
	habit: Habit,
	value: DayLogValue,
	frozen: boolean,
): RowStatus {
	const done = isDayLogValueDone(habit, value);
	if (frozen && !done) {
		return { text: todayCopy.editDayRowFrozen, tone: "frozen" };
	}
	if (habit.targetType === "quantity") {
		return {
			text: todayCopy.editDayRowAmount(
				typeof value === "number" ? value : 0,
				habit.targetAmount ?? 0,
				habit.targetUnit,
			),
			tone: "default",
		};
	}
	if (done) {
		return {
			text:
				habit.direction === "break"
					? todayCopy.editDayRowResisted
					: todayCopy.editDayRowDone,
			tone: "default",
		};
	}
	return { text: todayCopy.editDayRowMissed, tone: "default" };
}
