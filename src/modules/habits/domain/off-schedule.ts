import { format, parseISO } from "date-fns";
import { getHabitStrategy } from "../strategies/frequency-strategy";
import type { Entry, Habit } from "../types";
import { isEntryComplete } from "./streaks";

// Nothing is stored to mark a bonus: it is derived from the strategy, so streaks and rates
// (which walk scheduled days only) can't be reached by one.

export function offScheduleCandidates(habits: readonly Habit[]): Habit[] {
	return habits.filter(
		(habit) => habit.direction !== "break" && habit.archivedAt === null,
	);
}

// Judged with the entry itself counted as done, so a per-week habit's first log isn't
// mistaken for a bonus.
export function isOffScheduleEntry(
	habit: Habit,
	entry: Entry,
	habitEntries: readonly Entry[],
): boolean {
	return offScheduleChecker(habit, habitEntries)(entry);
}

export function offScheduleChecker(
	habit: Habit,
	habitEntries: readonly Entry[],
): (entry: Entry) => boolean {
	const strategy = getHabitStrategy(habit);
	const completedDates = habitEntries
		.filter((other) => isEntryComplete(habit, other))
		.map((other) => parseISO(other.date));
	const completedTimes = new Set(completedDates.map((date) => date.getTime()));
	return (entry) => {
		const day = parseISO(entry.date);
		const time = day.getTime();
		const counted = !Number.isNaN(time) && completedTimes.has(time);
		return !strategy.wasScheduledOn(day, {
			completedDates: counted ? completedDates : [...completedDates, day],
		});
	};
}

export type OffScheduleLog = { habit: Habit; entry: Entry };

// `entries` must cover the week of `day`; only completions before `day` count, as Today decides.
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
