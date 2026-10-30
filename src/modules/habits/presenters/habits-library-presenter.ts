import { formatDayMonth, formatDayMonthShort } from "@/utils/format";
import { habitsCopy } from "../messages";
import type { Habit } from "../types";
import { scheduleLabel } from "./habit-schedule-label";

/** "Daily", "Tue, Thu", "3× per week" — a habit's cadence as the library words it, lowercase after another word. */
function cadence(habit: Habit): string {
	const { frequency } = habit;
	if (frequency.type === "daily") return habitsCopy.daily;
	// `scheduleLabel` says "Every day" for a daily habit and "3× per week" for a per-week one.
	return scheduleLabel(habit);
}

const lowerFirst = (text: string) =>
	text.charAt(0).toLowerCase() + text.slice(1);
const upperFirst = (text: string) =>
	text.charAt(0).toUpperCase() + text.slice(1);

/** "8 glasses" — the quantity target a row names, or null for a simple check. */
function targetLabel(habit: Habit): string | null {
	if (habit.targetType !== "quantity" || habit.targetAmount === null)
		return null;
	return `${habit.targetAmount} ${habit.targetUnit ?? ""}`.trim();
}

/**
 * The streak a row names: a daily Build habit's, once it is two days or more.
 * A per-week habit's streak counts weeks, a weekday habit's counts only its own
 * days, and a Break habit's counts nights — none of them read as "N-day streak",
 * so none of them put one on the row (H1).
 */
function streakDetail(habit: Habit, streak: number): string | null {
	const plain = habit.direction === "build" && habit.frequency.type === "daily";
	return plain && streak >= 2 ? habitsCopy.streakDays(streak) : null;
}

/**
 * The line under a library row's name (H1): "Daily · 8 glasses", "3× per week",
 * "Tue, Thu", "Daily · 13-day streak", "Break · daily". A Break habit says so
 * first; a quantity habit names its target; a daily habit with a running streak
 * of two days or more names that; otherwise it is just its cadence.
 */
export function libraryRowSubtitle(habit: Habit, streak = 0): string {
	const detail = targetLabel(habit) ?? streakDetail(habit, streak);
	const parts =
		habit.direction === "break"
			? [habitsCopy.breakWord, lowerFirst(cadence(habit))]
			: [cadence(habit)];
	if (detail) parts.push(detail);
	return upperFirst(parts.join(" · "));
}

/** What VoiceOver says for a library row (08.3): "Drink water, Health, daily, 8 glasses." */
export function libraryRowLabel(habit: Habit, streak = 0): string {
	const target = targetLabel(habit);
	const parts = [
		habit.name,
		habit.category.name,
		habit.direction === "break" ? habitsCopy.breakLower : null,
		lowerFirst(cadence(habit)),
		target ?? streakDetail(habit, streak),
	];
	return parts.filter(Boolean).join(", ");
}

/**
 * A search result's line (H2): the category and how it repeats — "Health ·
 * daily", "Home · break" — or, for an archived habit, since when.
 */
export function resultRowSubtitle(habit: Habit): string {
	if (habit.archivedAt) {
		return habitsCopy.resultArchived(
			habit.category.name,
			formatDayMonthShort(habit.archivedAt),
		);
	}
	const how =
		habit.direction === "break"
			? habitsCopy.breakLower
			: lowerFirst(cadence(habit));
	return `${habit.category.name} · ${how}`;
}

/** "Archived 12 Oct · best streak 41" (H5); a habit that never had a streak says only when. */
export function archivedRowSubtitle(
	archivedAt: Date,
	bestStreak: number,
): string {
	const when = habitsCopy.archived.since(formatDayMonthShort(archivedAt));
	return bestStreak > 0
		? `${when} · ${habitsCopy.archived.bestStreak(bestStreak)}`
		: when;
}

/** "Morning run, archived 12 October. Restore, button." — the row's VoiceOver label (08.3). */
export function archivedRowLabel(habit: Habit): string {
	return habit.archivedAt
		? habitsCopy.archived.rowLabel(habit.name, formatDayMonth(habit.archivedAt))
		: habit.name;
}

/** Folds case and accents so "cafe" finds "Café" and "YOGA" finds "yoga". */
function normalise(text: string): string {
	return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** The query as typed, trimmed; empty means "not searching". */
export function searchTerm(query: string): string {
	return query.trim();
}

/**
 * The habits whose name contains `query`, in the order given — active and
 * archived searched together, split afterwards by the caller (H2).
 */
export function matchHabits<T extends { habit: Habit }>(
	rows: readonly T[],
	query: string,
): T[] {
	const needle = normalise(searchTerm(query));
	if (needle === "") return [...rows];
	return rows.filter(({ habit }) => normalise(habit.name).includes(needle));
}

/** "yoga" → "Yoga": the name Add habit opens with (H3). */
export function nameFromQuery(query: string): string {
	return upperFirst(searchTerm(query));
}

/** "7 active · 2 archived", "7 active", or "No habits" — the eyebrow over the title. */
export function libraryEyebrow(active: number, archived: number): string {
	if (active === 0 && archived === 0) return habitsCopy.eyebrow.none;
	return habitsCopy.eyebrow.counts(active, archived);
}

/** "7 active, 1 archived" — the header's VoiceOver count line (08.3). */
export function libraryCountsLabel(active: number, archived: number): string {
	if (active === 0 && archived === 0) return habitsCopy.eyebrow.none;
	return habitsCopy.counts(active, archived);
}
