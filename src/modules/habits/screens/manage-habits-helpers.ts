import { format } from "date-fns";
import { NO_CATEGORY_LABEL } from "../constants";
import type { Habit } from "../types";
import { frequencyLabel } from "./habit-detail-helpers";

/** "Morning · daily" / "Training · Mon, Wed, Fri" — an active row on Manage (HAB-13). */
export function manageRowSubtitle(habit: Habit): string {
	return `${habit.category ?? NO_CATEGORY_LABEL} · ${frequencyLabel(habit.frequency)}`;
}

/** "Archived 2 Sep · 41 logs kept". */
export function archivedRowSubtitle(
	archivedAt: Date,
	logsKept: number,
): string {
	const logs = `${logsKept} ${logsKept === 1 ? "log" : "logs"} kept`;
	return `Archived ${format(archivedAt, "d MMM")} · ${logs}`;
}

/** "Archived · 2". */
export function archivedSectionTitle(count: number): string {
	return `Archived · ${count}`;
}

export const MANAGE_FOOTNOTE =
	"Archiving keeps every past log and streak. Deleting is only offered from the habit detail screen.";
