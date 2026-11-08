import { THEME_PREFERENCE_SETTING_KEY } from "@/lib/app-settings/keys";
import { toDayKey } from "@/utils/day-key";
import {
	EVENING_REVIEW_SETTING_KEY,
	EVENING_REVIEW_TIME_SETTING_KEY,
	HIDE_HABIT_NAMES_SETTING_KEY,
	SEEN_FIRST_RUN_SETTING_KEY,
} from "../constants";
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
	/** The raw `app_settings` values by key; a key never set is absent. Only the user-facing keys are read. */
	settings: Readonly<Record<string, string | null | undefined>>;
};

type ExportLog = {
	date: string;
	/** The logged amount for a quantity habit; null for a simple check. */
	value: number | null;
	/** Whether the day counted — a quantity log below target is logged but not complete. */
	completed: boolean;
	/** When the log was first written. */
	createdAt: Date;
};

export type ExportNote = {
	date: string;
	note: string;
	updatedAt: Date | null;
};

export type ExportFrozenDay = { date: string; createdAt: Date };

type ExportHabitRecord = {
	habit: Habit;
	/** Computed from the logs — the file keeps them under `derived`; an importer ignores them. */
	currentStreak: number;
	longestStreak: number;
	logs: ExportLog[];
	/** Empty when the export leaves notes out. */
	notes: ExportNote[];
	frozenDays: ExportFrozenDay[];
	reminders: Reminder[];
};

/** The user-facing settings an export carries — never `lastExport`, never a dev key. null = never set (the app's default). */
export type ExportSettings = {
	themePreference: string | null;
	eveningReview: boolean | null;
	eveningReviewTime: string | null;
	seenFirstRun: boolean | null;
	/** Whether reminders hide the habit name (E-01); null = never set, which the app treats as hidden. */
	hideHabitNames: boolean | null;
};

export type ExportModel = {
	/** The day the export was made, "yyyy-MM-dd". */
	exportedOn: string;
	/** The moment the export was made. */
	exportedAt: Date;
	/** False when the person left notes out: no note text is in the model, or in either file. */
	notesIncluded: boolean;
	settings: ExportSettings;
	/** Every category, in the stored order (built-in or yours), whether or not a habit uses it. */
	categories: Category[];
	habits: ExportHabitRecord[];
	logCount: number;
	noteCount: number;
};

function readBoolean(value: string | null | undefined): boolean | null {
	if (value === "true") return true;
	if (value === "false") return false;
	return null;
}

function readSettings(source: ExportSource["settings"]): ExportSettings {
	return {
		themePreference: source[THEME_PREFERENCE_SETTING_KEY] ?? null,
		eveningReview: readBoolean(source[EVENING_REVIEW_SETTING_KEY]),
		eveningReviewTime: source[EVENING_REVIEW_TIME_SETTING_KEY] ?? null,
		seenFirstRun: readBoolean(source[SEEN_FIRST_RUN_SETTING_KEY]),
		hideHabitNames: readBoolean(source[HIDE_HABIT_NAMES_SETTING_KEY]),
	};
}

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
		const frozenDays = source.frozenDays
			.filter((day) => day.habitId === habit.id)
			.map((day) => ({ date: day.date, createdAt: day.createdAt }))
			.sort(byDate);
		const history = {
			habit,
			entries,
			frozenDates: new Set(frozenDays.map((day) => day.date)),
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
					createdAt: entry.createdAt,
				}))
				.sort(byDate),
			// Left out here, at the source, so no serializer can write one by mistake.
			notes: options.includeNotes
				? source.notes
						.filter((note) => note.habitId === habit.id)
						.map(({ date, note, updatedAt }) => ({
							date,
							note,
							updatedAt: updatedAt ?? null,
						}))
						.sort(byDate)
				: [],
			frozenDays,
			reminders: source.reminders
				.filter((reminder) => reminder.habitId === habit.id)
				.sort((a, b) => a.hour - b.hour || a.minute - b.minute),
		};
	});

	return {
		exportedOn: toDayKey(today),
		exportedAt: today,
		notesIncluded: options.includeNotes,
		settings: readSettings(source.settings),
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
		...record.frozenDays.map((day) => day.date),
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
