import {
	type ExportSource,
	type ExportSummary,
	summarizeExport,
} from "../domain/export-data";
import { useAllEntries, useEntryNotes } from "../repositories/entry-repository";
import { useFrozenDays } from "../repositories/frozen-day-repository";
import { useHabitsList } from "../repositories/habit-repository";
import type { ExportOptions } from "../types";

/** Archived habits are included by default (HAB-15) — the Settings row quotes the same. */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
	format: "csv",
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
	const source = { habits, entries, notes, frozenDays };

	return { source, summary: summarizeExport(source, options, new Date()) };
}
