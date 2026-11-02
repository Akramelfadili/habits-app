import { toDayKey } from "@/utils/day-key";
import type {
	Category,
	Entry,
	EntryNote,
	ExportOptions,
	FrozenDay,
	Habit,
	Reminder,
} from "../types";
import { calculateLongestStreak, currentStreakAsOf } from "./habit-history";
import { isEntryComplete } from "./streaks";

/**
 * What an export (HAB-15) is built from, and the format-independent shape it's
 * turned into before either serializer sees it. Pure — no I/O — so the confirm
 * sheet's counts and the written file can never disagree: both come from
 * `buildExportModel`.
 */

export type ExportSource = {
	habits: readonly Habit[];
	entries: readonly Entry[];
	notes: readonly EntryNote[];
	frozenDays: readonly FrozenDay[];
	/** Every reminder row — the file carries each habit's own (HAB-44). */
	reminders: readonly Reminder[];
	/** Every category in the stored order, so the file keeps the group order too. */
	categories: readonly Category[];
};

type ExportLog = {
	date: string;
	/** The logged amount for a quantity habit; null for a simple check. */
	value: number | null;
	/** Whether the day counted — a quantity log below target is logged but not complete. */
	completed: boolean;
};

type ExportHabitRecord = {
	habit: Habit;
	currentStreak: number;
	longestStreak: number;
	logs: ExportLog[];
	notes: { date: string; note: string }[];
	frozenDates: string[];
	reminders: Reminder[];
};

export type ExportModel = {
	/** The day the export was made, "yyyy-MM-dd". */
	exportedOn: string;
	/** Every category, in the stored order (built-in or yours), whether or not a habit uses it. */
	categories: Category[];
	habits: ExportHabitRecord[];
	logCount: number;
	noteCount: number;
};

export type ExportSummary = {
	activeHabits: number;
	archivedHabits: number;
	/** Completed/logged days — the number the Export button quotes. */
	logs: number;
	notes: number;
	/** First and last day anything was recorded, "yyyy-MM-dd"; null when nothing has been. */
	range: { from: string; to: string } | null;
};

const byDate = (a: { date: string }, b: { date: string }) =>
	a.date.localeCompare(b.date);

/** Archived habits are left out unless asked for; everything belonging to a left-out habit goes with it. */
export function buildExportModel(
	source: ExportSource,
	options: ExportOptions,
	today: Date,
): ExportModel {
	const habits = source.habits.filter(
		(habit) => options.includeArchived || habit.archivedAt === null,
	);

	const records = habits.map((habit): ExportHabitRecord => {
		const entries = source.entries.filter(
			(entry) => entry.habitId === habit.id,
		);
		const frozenDates = source.frozenDays
			.filter((day) => day.habitId === habit.id)
			.map((day) => day.date)
			.sort();
		const history = {
			habit,
			entries,
			frozenDates: new Set(frozenDates),
			today,
		};
		return {
			habit,
			currentStreak: currentStreakAsOf(history),
			longestStreak: calculateLongestStreak(history).days,
			logs: entries
				.map((entry) => ({
					date: entry.date,
					value: entry.value ?? null,
					completed: isEntryComplete(habit, entry),
				}))
				.sort(byDate),
			notes: source.notes
				.filter((note) => note.habitId === habit.id)
				.map(({ date, note }) => ({ date, note }))
				.sort(byDate),
			frozenDates,
			reminders: source.reminders
				.filter((reminder) => reminder.habitId === habit.id)
				.sort((a, b) => a.hour - b.hour || a.minute - b.minute),
		};
	});

	return {
		exportedOn: toDayKey(today),
		categories: [...source.categories],
		habits: records,
		logCount: records.reduce((sum, record) => sum + record.logs.length, 0),
		noteCount: records.reduce((sum, record) => sum + record.notes.length, 0),
	};
}

/** The confirm sheet's counts and range for the current options. */
export function summarizeExport(
	source: ExportSource,
	options: ExportOptions,
	today: Date,
): ExportSummary {
	const model = buildExportModel(source, options, today);
	const dates = model.habits.flatMap((record) => [
		...record.logs.map((log) => log.date),
		...record.notes.map((note) => note.date),
		...record.frozenDates,
	]);
	dates.sort();

	return {
		activeHabits: source.habits.filter((habit) => habit.archivedAt === null)
			.length,
		archivedHabits: options.includeArchived
			? source.habits.filter((habit) => habit.archivedAt !== null).length
			: 0,
		logs: model.logCount,
		notes: model.noteCount,
		range: dates.length
			? { from: dates[0], to: dates[dates.length - 1] }
			: null,
	};
}
