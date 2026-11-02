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

/** Archived habits are always included (HAB-44); JSON is the default, as the sheet opens on it. */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
	format: "json",
	includeArchived: true,
};

/** The export sheet's data and the counts/range it quotes for the current options. */
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
	const source = { habits, entries, notes, frozenDays, reminders, categories };

	return { source, summary: summarizeExport(source, options, new Date()) };
}
