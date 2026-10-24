import { useAppSetting } from "@/lib/app-settings/repositories/app-settings-repository";
import { getAppInfo } from "@/lib/diagnostics/app-info";
import { useNotificationPermission } from "@/lib/notifications/use-notification-permission";
import { useThemePreferenceStore } from "@/theme/theme-preference-store";
import { useTheme } from "@/theme/use-theme";
import {
	EVENING_REVIEW_SETTING_KEY,
	LAST_EXPORT_SETTING_KEY,
} from "../constants";
import {
	type ExportSource,
	type ExportSummary,
	summarizeExport,
} from "../domain/export-data";
import { lastExportLabel } from "../presenters/settings-helpers";
import { useAllEntries, useEntryNotes } from "../repositories/entry-repository";
import { useFrozenDays } from "../repositories/frozen-day-repository";
import { useHabitsList } from "../repositories/habit-repository";
import type { ExportOptions } from "../types";

/** Archived habits are included by default (HAB-15) — the Settings row quotes the same. */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
	format: "csv",
	includeArchived: true,
};

/**
 * Everything the Settings screen (HAB-15) shows. The Evening review reads the
 * very setting the per-habit Reminders screen reads, so the two can't drift.
 */
export function useSettingsQueries() {
	const preference = useThemePreferenceStore((state) => state.preference);
	const { scheme } = useTheme();
	const eveningReview = useAppSetting(EVENING_REVIEW_SETTING_KEY);
	const permission = useNotificationPermission();
	const lastExport = useAppSetting(LAST_EXPORT_SETTING_KEY);
	const { summary } = useExportQueries(DEFAULT_EXPORT_OPTIONS);

	return {
		themePreference: preference,
		/** What "System" currently resolves to — the Appearance caption reports it. */
		resolvedScheme: scheme,
		eveningReviewEnabled: eveningReview === "true",
		notificationsDenied: permission === "denied",
		lastExport: lastExportLabel(lastExport ?? null, new Date()),
		exportSummary: summary,
		/** Version, build and database schema — the About group. */
		about: getAppInfo(),
	};
}

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
