import { formatDayMonth, formatDayMonthShort } from "@/utils/format";
import { habitsCopy } from "../messages";
import type { Habit } from "../types";
import { scheduleLabel } from "./habit-schedule-label";

function cadence(habit: Habit): string {
	const { frequency } = habit;
	if (frequency.type === "daily") return habitsCopy.daily;
	return scheduleLabel(habit);
}

const lowerFirst = (text: string) =>
	text.charAt(0).toLowerCase() + text.slice(1);
const upperFirst = (text: string) =>
	text.charAt(0).toUpperCase() + text.slice(1);

function targetLabel(habit: Habit): string | null {
	if (habit.targetType !== "quantity" || habit.targetAmount === null)
		return null;
	return `${habit.targetAmount} ${habit.targetUnit ?? ""}`.trim();
}

/**
 * The streak a row names: a daily Build habit's, once it is two days or more. A per-week
 * habit's streak counts weeks, a weekday habit's counts only its own days, and a Break
 * habit's counts nights: none of them read as an N-day streak, so none put one on the row.
 */
function streakDetail(habit: Habit, streak: number): string | null {
	const plain = habit.direction === "build" && habit.frequency.type === "daily";
	return plain && streak >= 2 ? habitsCopy.streakDays(streak) : null;
}

/**
 * The line under a library row's name. A Break habit says so first; a quantity habit
 * names its target; a daily habit with a streak of two days or more names that; otherwise
 * it is just its cadence.
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

export function archivedRowSubtitle(
	archivedAt: Date,
	bestStreak: number,
): string {
	const when = habitsCopy.archived.since(formatDayMonthShort(archivedAt));
	return bestStreak > 0
		? `${when} · ${habitsCopy.archived.bestStreak(bestStreak)}`
		: when;
}

export function archivedRowLabel(habit: Habit): string {
	return habit.archivedAt
		? habitsCopy.archived.rowLabel(habit.name, formatDayMonth(habit.archivedAt))
		: habit.name;
}

/** Folds case and accents so "cafe" finds "Café" and "YOGA" finds "yoga". */
function normalise(text: string): string {
	return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function searchTerm(query: string): string {
	return query.trim();
}

/**
 * The habits whose name contains query, in the order given: active and archived are
 * searched together and split afterwards by the caller.
 */
export function matchHabits<T extends { habit: Habit }>(
	rows: readonly T[],
	query: string,
): T[] {
	const needle = normalise(searchTerm(query));
	if (needle === "") return [...rows];
	return rows.filter(({ habit }) => normalise(habit.name).includes(needle));
}

export function nameFromQuery(query: string): string {
	return upperFirst(searchTerm(query));
}

export function libraryEyebrow(active: number, archived: number): string {
	if (active === 0 && archived === 0) return habitsCopy.eyebrow.none;
	return habitsCopy.eyebrow.counts(active, archived);
}

export function libraryCountsLabel(active: number, archived: number): string {
	if (active === 0 && archived === 0) return habitsCopy.eyebrow.none;
	return habitsCopy.counts(active, archived);
}
