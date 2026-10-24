import { format, parseISO } from "date-fns";
import { getHabitStrategy } from "../strategies/frequency-strategy";
import type { Entry, Habit } from "../types";
import { isEntryComplete } from "./streaks";

/**
 * Off-schedule logs (HAB-18). Nothing is stored to mark one: an entry is a
 * bonus when its day wasn't owed by the habit's FrequencyStrategy. Streaks,
 * rates and perfect days only ever walk *scheduled* days, so a bonus entry
 * can't reach them — it stays informational.
 */

/** Habits the rest-day picker offers: a "don't do X" habit can't be logged as a bonus, and an archived one is out of every active list (HAB-13). */
export function offScheduleCandidates(habits: readonly Habit[]): Habit[] {
	return habits.filter(
		(habit) => habit.direction !== "break" && habit.archivedAt === null,
	);
}

/**
 * Whether `entry` was a bonus: its day wasn't scheduled, judged with the
 * entry itself counted as done that day (so a per-week habit's partial first
 * log isn't mistaken for a bonus). `habitEntries` are that habit's own.
 */
export function isOffScheduleEntry(
	habit: Habit,
	entry: Entry,
	habitEntries: readonly Entry[],
): boolean {
	const completedDates = habitEntries
		.filter((other) => isEntryComplete(habit, other))
		.map((other) => parseISO(other.date));
	if (
		!completedDates.some(
			(date) => date.getTime() === parseISO(entry.date).getTime(),
		)
	) {
		completedDates.push(parseISO(entry.date));
	}
	return !getHabitStrategy(habit).wasScheduledOn(parseISO(entry.date), {
		completedDates,
	});
}

export type OffScheduleLog = { habit: Habit; entry: Entry };

/**
 * What was logged on `day` for habits that weren't due that day — the rest-day
 * screen's "Logged today · off-schedule" list. `entries` must cover the
 * week of `day` (a per-week habit's due-ness depends on earlier completions);
 * only completions *before* `day` count, exactly as Today decides what's due.
 */
export function offScheduleLogsOn(
	habits: readonly Habit[],
	entries: readonly Entry[],
	day: Date,
): OffScheduleLog[] {
	const dayString = format(day, "yyyy-MM-dd");
	const logs: OffScheduleLog[] = [];
	for (const habit of habits) {
		const own = entries.filter((entry) => entry.habitId === habit.id);
		const entry = own.find((candidate) => candidate.date === dayString);
		if (!entry) continue;
		const completedDates = own
			.filter((other) => isEntryComplete(habit, other))
			.map((other) => parseISO(other.date));
		if (!getHabitStrategy(habit).isDueOn(day, { completedDates })) {
			logs.push({ habit, entry });
		}
	}
	return logs;
}
