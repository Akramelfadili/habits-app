import {
	HAPTICS_SETTING_KEY,
	THEME_PREFERENCE_SETTING_KEY,
} from "@/lib/app-settings/keys";
import { useAppSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import {
	EVENING_REVIEW_SETTING_KEY,
	EVENING_REVIEW_TIME_SETTING_KEY,
	HIDE_HABIT_NAMES_SETTING_KEY,
	SEEN_FIRST_RUN_SETTING_KEY,
} from "../constants";
import {
	type ExportSource,
	type ExportSummary,
	summarizeExport,
} from "../domain/export-data";
import { useCategories } from "../repositories/category-repository";
import { useAllEntries, useEntryNotes } from "../repositories/entry-repository";
import { useFrozenDays } from "../repositories/frozen-day-repository";
import { useHabitsList } from "../repositories/habit-repository";
import { useAllReminders } from "../repositories/reminder-repository";
import type { ExportOptions } from "../types";

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
	format: "json",
	includeArchived: true,
	includeNotes: true,
};

export function useExportQueries(options: ExportOptions): {
	source: ExportSource;
	summary: ExportSummary;
} {
	const { habits } = useHabitsList();
	const entries = useAllEntries();
	const notes = useEntryNotes();
	const frozenDays = useFrozenDays();
	const reminders = useAllReminders();
	const categories = useCategories();
	// Only the user-facing keys; `useAppSetting` is undefined until it has loaded.
	const settings = {
		[THEME_PREFERENCE_SETTING_KEY]: useAppSetting(THEME_PREFERENCE_SETTING_KEY),
		[EVENING_REVIEW_SETTING_KEY]: useAppSetting(EVENING_REVIEW_SETTING_KEY),
		[EVENING_REVIEW_TIME_SETTING_KEY]: useAppSetting(
			EVENING_REVIEW_TIME_SETTING_KEY,
		),
		[SEEN_FIRST_RUN_SETTING_KEY]: useAppSetting(SEEN_FIRST_RUN_SETTING_KEY),
		[HIDE_HABIT_NAMES_SETTING_KEY]: useAppSetting(HIDE_HABIT_NAMES_SETTING_KEY),
		[HAPTICS_SETTING_KEY]: useAppSetting(HAPTICS_SETTING_KEY),
	};
	const source = {
		habits,
		entries,
		notes,
		frozenDays,
		reminders,
		categories,
		settings,
	};

	return { source, summary: summarizeExport(source, options, new Date()) };
}
