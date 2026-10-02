import { format, isSameDay, isSameYear, parseISO } from "date-fns";
import type { ThemePreference } from "@/theme/theme-preference-store";
import type { ExportSummary } from "../services/export-data";
import type { ExportFailureReason } from "../services/export-service";

/** Settings' "Last export" value (HAB-15): "Never", "Today", "2 August", or with the year once it's not this one. */
export function lastExportLabel(stored: string | null, today: Date): string {
	if (!stored) return "Never";
	const day = parseISO(stored);
	if (isSameDay(day, today)) return "Today";
	return format(day, isSameYear(day, today) ? "d MMMM" : "d MMMM yyyy");
}

/** Today's menu row under Settings: the last export once there is one, else what Settings holds. */
export function settingsMenuSubline(
	stored: string | null,
	today: Date,
): string {
	return stored
		? `Last export: ${lastExportLabel(stored, today)}`
		: "Appearance, evening review, export";
}

/** The caption under the Appearance control — what the choice means right now. */
export function appearanceCaption(
	preference: ThemePreference,
	resolved: "light" | "dark",
): string {
	switch (preference) {
		case "light":
			return "Always light, whatever your iPhone is set to.";
		case "dark":
			return "Always dark, whatever your iPhone is set to.";
		case "system":
			return `Matches your iPhone — currently ${resolved}. Switches whenever iOS does.`;
	}
}

export const EVENING_REVIEW_FOOTNOTE =
	"Applies to every habit at once. Reminder times for a single habit stay on that habit's Reminders screen.";

export const NOTIFICATIONS_OFF_NOTICE =
	"Notifications are off for Habits in iOS, so the review won't arrive yet.";

export const formatCount = (value: number) => value.toLocaleString("en-GB");

/** "One file · 9 habits · 1,284 entries" — the Export row's subtitle. */
export function exportRowSubtitle(habits: number, logs: number): string {
	const habitsLabel =
		habits === 1 ? "1 habit" : `${formatCount(habits)} habits`;
	return `One file · ${habitsLabel} · ${entriesLabel(logs)}`;
}

export function entriesLabel(total: number): string {
	return total === 1 ? "1 entry" : `${formatCount(total)} entries`;
}

export function habitsCountLabel(summary: ExportSummary): string {
	return summary.archivedHabits > 0
		? `${summary.activeHabits} active · ${summary.archivedHabits} archived`
		: `${summary.activeHabits} active`;
}

export function logsCountLabel(summary: ExportSummary): string {
	return `${formatCount(summary.logs)} logs · ${formatCount(summary.notes)} notes`;
}

/** "3 Mar – 16 Sep 2026" — or one date when the data sits on a single day. */
export function rangeLabel(range: ExportSummary["range"]): string {
	if (!range) return "No entries yet";
	const from = parseISO(range.from);
	const to = parseISO(range.to);
	if (isSameDay(from, to)) return format(to, "d MMM yyyy");
	const fromLabel = format(from, isSameYear(from, to) ? "d MMM" : "d MMM yyyy");
	return `${fromLabel} – ${format(to, "d MMM yyyy")}`;
}

export function exportButtonLabel(logs: number): string {
	return `Export ${entriesLabel(logs)}`;
}

export function kilobytesLabel(bytes: number): string {
	return `${Math.max(1, Math.ceil(bytes / 1024)).toLocaleString("en-GB")} KB`;
}

/** What the failed sheet says went wrong, and what's needed. */
export function exportFailureMessage(reason: ExportFailureReason): string {
	return reason.kind === "storage"
		? `This iPhone is out of storage. The file needs about ${kilobytesLabel(reason.neededBytes)} free.`
		: "Something went wrong while writing the file. Try again in a moment.";
}

export const EXPORT_FAILURE_REASSURANCE =
	"Nothing was changed — your habits and logs are untouched.";
