import { format, isSameDay, isSameYear, parseISO } from "date-fns";
import type { ThemePreference } from "@/theme/theme-preference-store";
import { formatCount, pluralise, RANGE_DASH } from "@/utils/format";
import type { ExportSummary } from "../domain/export-data";
import type { ExportFailureReason, Habit, Reminder } from "../types";

export function entriesLabel(total: number): string {
	return pluralise(total, "entry", "entries");
}

export function habitsCountLabel(summary: ExportSummary): string {
	return summary.archivedHabits > 0
		? `${summary.activeHabits} active · ${summary.archivedHabits} archived`
		: `${summary.activeHabits} active`;
}

export function logsCountLabel(summary: ExportSummary): string {
	return `${pluralise(summary.logs, "entry", "entries")} · ${pluralise(summary.notes, "note")}`;
}

/** "3 Mar – 16 Sep 2026" — or one date when the data sits on a single day. */
export function rangeLabel(range: ExportSummary["range"]): string {
	if (!range) return "No entries yet";
	const from = parseISO(range.from);
	const to = parseISO(range.to);
	if (isSameDay(from, to)) return format(to, "d MMM yyyy");
	const fromLabel = format(from, isSameYear(from, to) ? "d MMM" : "d MMM yyyy");
	return `${fromLabel}${RANGE_DASH}${format(to, "d MMM yyyy")}`;
}

export function exportButtonLabel(logs: number): string {
	return `Export ${entriesLabel(logs)}`;
}

export function kilobytesLabel(bytes: number): string {
	return `${formatCount(Math.max(1, Math.ceil(bytes / 1024)))} KB`;
}

/** What the failed sheet says went wrong, and what's needed. */
export function exportFailureMessage(reason: ExportFailureReason): string {
	return reason.kind === "storage"
		? `This iPhone is out of storage. The file needs about ${kilobytesLabel(reason.neededBytes)} free.`
		: "Something went wrong while writing the file. Try again in a moment.";
}

export const EXPORT_FAILURE_REASSURANCE =
	"Nothing was changed — your habits and logs are untouched.";

/** "1.0.0 (build 12)" — the About row's value. */
export function versionLabel(info: { version: string; build: string }): string {
	return `${info.version} (build ${info.build})`;
}

/** What a denied iOS permission holds back (SY6): the enabled times and the active habits they belong to. */
export function notificationImpact(
	reminders: readonly Pick<Reminder, "habitId" | "enabled">[],
	habits: readonly Pick<Habit, "id" | "archivedAt">[],
): { times: number; habits: number } {
	const active = new Set(
		habits
			.filter((habit) => habit.archivedAt === null)
			.map((habit) => habit.id),
	);
	const live = reminders.filter(
		(reminder) => reminder.enabled && active.has(reminder.habitId),
	);
	return {
		times: live.length,
		habits: new Set(live.map((reminder) => reminder.habitId)).size,
	};
}
