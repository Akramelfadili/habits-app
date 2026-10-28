import { format } from "date-fns";
import { todayCopy } from "../messages";
import type { Habit } from "../types";

export type RowStatusTone = "default" | "warning" | "frozen";

export type RowStatus = { text: string; tone: RowStatusTone };

type RowStatusInput = {
	habit: Habit;
	completed: boolean;
	/** The shown day's logged amount (quantity habits). */
	quantityValue: number;
	/** Days completed so far in the shown day's week (per-week habits). */
	completedThisWeek: number;
	/** The running streak, when there is one (`useTodayQueries().streakByHabitId`). */
	streak: number | undefined;
	atRisk: { missedDate: Date; freezesRemaining: number } | undefined;
	frozenYesterday: { date: Date; streak: number } | undefined;
	/** False when a past day is shown ("Resisted", not "Resisted today"). */
	isToday: boolean;
	/** The real today after `EVENING_STARTS_AT_HOUR`: an open Break habit reads "Resist tonight". */
	isEvening?: boolean;
};

/**
 * The line under a Today row's name (V3-13, HAB-31): the streak or the amount,
 * never a completion time. At risk and frozen win over everything else, since
 * they are what the row needs from you. `undefined` = a plain habit with no
 * streak yet, whose row shows just its name.
 */
export function todayRowStatus(input: RowStatusInput): RowStatus | undefined {
	const { habit, completed, atRisk, frozenYesterday } = input;
	const streak = input.streak ?? 0;

	// A habit done today is no longer waiting on a decision: its row reads like any other.
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
