import { formatDayMonthShort, pluralise } from "@/utils/format";
import type { Habit } from "../types";
import { frequencyLabel } from "./habit-detail-helpers";

/** "Morning · daily" / "Training · Mon, Wed, Fri" — an active row on Manage (HAB-13). */
export function manageRowSubtitle(habit: Habit): string {
	return `${habit.category.name} · ${frequencyLabel(habit.frequency)}`;
}

/**
 * "Archived 2 Sep · 41 days logged" ("nothing logged" for a habit with no
 * history) — "days logged" is the one per-habit term (audit A5-17).
 */
export function archivedRowSubtitle(
	archivedAt: Date,
	logsKept: number,
): string {
	const logs =
		logsKept === 0 ? "nothing logged" : `${pluralise(logsKept, "day")} logged`;
	return `Archived ${formatDayMonthShort(archivedAt)} · ${logs}`;
}

/** "Archived · 2". */
export function archivedSectionTitle(count: number): string {
	return `Archived · ${count}`;
}

export const MANAGE_FOOTNOTE =
	"Order is set per category and matches Today. To move a habit to another category, edit it.";

/** "Reordering within Training" — the lifted group's header note. */
export function reorderingTag(categoryName: string): string {
	return `Reordering within ${categoryName}`;
}

/**
 * Why there's nothing active. Everything archived (E2) points at Restore;
 * with no habits at all there's nothing to restore, so it doesn't say so.
 */
export function noActiveMessage(archivedCount: number): string {
	return archivedCount > 0
		? "Everything is archived, so Today is empty. Restore one below or start something new."
		: "You haven't added a habit yet, so Today is empty. Start something new.";
}

export const NOTHING_ARCHIVED_MESSAGE =
	"Archive a habit from Edit habit, or swipe it left above, to hide it from Today and keep its history.";
