import { format } from "date-fns";
import { todayCopy } from "../messages";
import type { Habit } from "../types";

export type RowStatusTone = "default" | "warning" | "frozen";

export type RowStatus = { text: string; tone: RowStatusTone };

type RowStatusInput = {
	habit: Habit;
	completed: boolean;
	quantityValue: number;
	completedThisWeek: number;
	streak: number | undefined;
	atRisk: { missedDate: Date; freezesRemaining: number } | undefined;
	frozenYesterday: { date: Date; streak: number } | undefined;
	isToday: boolean;
	isEvening?: boolean;
};

// At risk and frozen win over everything else: they are what the row needs from you.
export function todayRowStatus(input: RowStatusInput): RowStatus | undefined {
	const { habit, completed, atRisk, frozenYesterday } = input;
	const streak = input.streak ?? 0;

	if (atRisk && !completed) {
		return {
			text: todayCopy.rowAtRisk(
				format(atRisk.missedDate, "EEEE"),
				atRisk.freezesRemaining,
			),
			tone: "warning",
		};
	}
	if (frozenYesterday) {
		return {
			text: todayCopy.rowFrozen(
				format(frozenYesterday.date, "EEE"),
				frozenYesterday.streak,
			),
			tone: "frozen",
		};
	}
	if (habit.targetType === "quantity" && habit.targetAmount !== null) {
		return {
			text: todayCopy.rowAmount(
				input.quantityValue,
				habit.targetAmount,
				habit.targetUnit,
			),
			tone: "default",
		};
	}
	if (habit.frequency.type === "per-week") {
		return {
			text: todayCopy.rowPerWeek(
				habit.frequency.timesPerWeek,
				input.completedThisWeek,
			),
			tone: "default",
		};
	}
	if (habit.direction === "break") {
		return {
			text: completed
				? todayCopy.rowResisted(streak, input.isToday)
				: input.isToday && input.isEvening
					? todayCopy.rowResistTonight(streak)
					: todayCopy.rowResisting(streak),
			tone: "default",
		};
	}
	return streak > 0
		? { text: todayCopy.rowStreak(streak), tone: "default" }
		: undefined;
}
