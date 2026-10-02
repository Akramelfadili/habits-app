import { format } from "date-fns";
import type { Habit } from "../types";
import { frequencyLabel } from "./habit-detail-helpers";

/** "Morning · daily" / "Training · Mon, Wed, Fri" — an active row on Manage (HAB-13). */
export function manageRowSubtitle(habit: Habit): string {
	return `${habit.category.name} · ${frequencyLabel(habit.frequency)}`;
}

/**
 * "2 Sep · 41 days logged" ("nothing logged" for a habit with no history).
 * No "Archived" prefix — the row already sits under the "Archived · N"
 * heading, and the repeat made it wrap beside Restore.
 */
export function archivedRowSubtitle(
	archivedAt: Date,
	logsKept: number,
): string {
	const logs =
		logsKept === 0
			? "nothing logged"
			: `${logsKept} ${logsKept === 1 ? "day" : "days"} logged`;
	return `${format(archivedAt, "d MMM")} · ${logs}`;
}

/** "Archived · 2". */
export function archivedSectionTitle(count: number): string {
	return `Archived · ${count}`;
}

export const MANAGE_FOOTNOTE =
	"Archiving keeps every logged day and streak. Deleting is only offered from the habit detail screen.";
