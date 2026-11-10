import { addDays, addHours } from "date-fns";
import { fromDayKey, toDayKey } from "@/utils/day-key";
import { buildMonthCalendar, buildWeekMatrix } from "../domain/progress-grid";
import { progressInsights } from "../domain/progress-insights";
import { progressUnlock } from "../domain/progress-unlock";
import { buildRangeSummary, rangeWindowFor } from "../domain/range-summary";
import { buildYearMap } from "../domain/year-map";
import type { ProgressView } from "../hooks/use-progress-base-queries";
import type { Entry, FrozenDay, Habit } from "../types";
import { builtInCategory, makeHabit } from "./habit-builder";

export const PROGRESS_TODAY = addHours(fromDayKey("2026-10-23"), 12);

const LONG_AGO = fromDayKey("2026-10-12");

export const water = makeHabit({
	id: 1,
	name: "Drink water",
	category: builtInCategory("Health"),
	createdAt: LONG_AGO,
});
export const read = makeHabit({
	id: 2,
	name: "Read 20 min",
	category: builtInCategory("Learning"),
	createdAt: LONG_AGO,
});
export const noSocial = makeHabit({
	id: 3,
	name: "No social media",
	category: builtInCategory("Productivity"),
	direction: "break",
	createdAt: LONG_AGO,
});
export const progressHabits: Habit[] = [water, read, noSocial];

let nextId = 1;
function entry(habit: Habit, date: Date): Entry {
	nextId += 1;
	return {
		id: nextId,
		habitId: habit.id,
		date: toDayKey(date),
		createdAt: date,
	};
}

export function progressEntries(): Entry[] {
	const entries: Entry[] = [];
	for (let offset = 0; offset < 7; offset += 1) {
		const date = addDays(fromDayKey("2026-10-12"), offset);
		for (const habit of progressHabits) entries.push(entry(habit, date));
	}
	for (let offset = 0; offset < 5; offset += 1) {
		const date = addDays(fromDayKey("2026-10-19"), offset);
		entries.push(entry(water, date), entry(noSocial, date));
		if (offset < 2) entries.push(entry(read, date));
	}
	return entries;
}

export const progressFrozen: FrozenDay[] = [
	{ id: 1, habitId: read.id, date: "2026-10-22", createdAt: PROGRESS_TODAY },
];

type Scenario = "ready" | "too-early" | "nothing-logged";

function setup(scenario: Scenario, habits: Habit[]) {
	const entries = scenario === "nothing-logged" ? [] : progressEntries();
	const first = scenario === "too-early" ? fromDayKey("2026-10-21") : null;
	const scoped =
		scenario === "too-early" && first
			? habits.map((habit) => ({ ...habit, createdAt: first }))
			: habits;
	const kept =
		scenario === "too-early"
			? entries.filter((e) => e.date >= toDayKey(first as Date))
			: entries;
	const unlock =
		scenario === "ready"
			? progressUnlock({ count: 40, firstDate: "2026-09-01" })
			: scenario === "too-early"
				? progressUnlock({ count: 3, firstDate: "2026-10-21" })
				: progressUnlock({ count: 0, firstDate: null });
	return { entries: kept, habits: scoped, unlock };
}

const FREEZES_LEFT = 1;

export function weekView(
	scenario: Scenario = "ready",
	habits: Habit[] = progressHabits,
): ProgressView<ReturnType<typeof buildWeekMatrix>> {
	const { entries, habits: scoped, unlock } = setup(scenario, habits);
	const week = rangeWindowFor("week", PROGRESS_TODAY);
	const grid = buildWeekMatrix({
		habits: scoped,
		entries,
		frozenDays: progressFrozen,
		today: PROGRESS_TODAY,
		week,
		nothingLogged: scenario === "nothing-logged",
	});
	if (scenario !== "ready") return { state: scenario, unlock, grid };
	const summary = buildRangeSummary({
		kind: "week",
		habits: scoped,
		entries,
		frozenDays: progressFrozen,
		today: PROGRESS_TODAY,
		window: week,
		streakHistory: { entries, frozenDays: progressFrozen },
	});
	return {
		state: "ready",
		unlock,
		grid,
		summary,
		insights: progressInsights({
			summary,
			unlocked: true,
			today: PROGRESS_TODAY,
		}),
		freezesLeft: FREEZES_LEFT,
	};
}

export function monthView(
	scenario: Scenario = "ready",
	habits: Habit[] = progressHabits,
): ProgressView<ReturnType<typeof buildMonthCalendar>> {
	const { entries, habits: scoped, unlock } = setup(scenario, habits);
	const window = rangeWindowFor("month", PROGRESS_TODAY);
	const grid = buildMonthCalendar({
		habits: scoped,
		entries,
		frozenDays: progressFrozen,
		today: PROGRESS_TODAY,
		month: window,
		nothingLogged: scenario === "nothing-logged",
	});
	if (scenario !== "ready") return { state: scenario, unlock, grid };
	const summary = buildRangeSummary({
		kind: "month",
		habits: scoped,
		entries,
		frozenDays: progressFrozen,
		today: PROGRESS_TODAY,
		window,
	});
	return {
		state: "ready",
		unlock,
		grid,
		summary,
		insights: progressInsights({
			summary,
			unlocked: true,
			today: PROGRESS_TODAY,
		}),
		freezesLeft: FREEZES_LEFT,
	};
}

export function yearView(
	scenario: Scenario = "ready",
	habits: Habit[] = progressHabits,
): ProgressView<ReturnType<typeof buildYearMap>> {
	const { entries, habits: scoped, unlock } = setup(scenario, habits);
	const window = rangeWindowFor("year", PROGRESS_TODAY);
	const grid = buildYearMap({
		habits: scoped,
		entries,
		frozenDays: progressFrozen,
		today: PROGRESS_TODAY,
		year: window,
		nothingLogged: scenario === "nothing-logged",
	});
	if (scenario !== "ready") return { state: scenario, unlock, grid };
	const summary = buildRangeSummary({
		kind: "year",
		habits: scoped,
		entries,
		frozenDays: progressFrozen,
		today: PROGRESS_TODAY,
		window,
	});
	return {
		state: "ready",
		unlock,
		grid,
		summary,
		insights: progressInsights({
			summary,
			unlocked: true,
			today: PROGRESS_TODAY,
			firstDay: fromDayKey("2026-01-01"),
			bestMonth: grid.bestMonth
				? { month: grid.bestMonth.month, percent: grid.bestMonth.percent ?? 0 }
				: null,
		}),
		freezesLeft: FREEZES_LEFT,
	};
}
