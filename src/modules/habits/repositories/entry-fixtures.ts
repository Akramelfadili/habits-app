import { addDays, format, startOfWeek, subDays } from "date-fns";
import { WEEK_STARTS_ON } from "../constants";
import type { Entry, EntryNote } from "../types";
import { HABIT_DETAIL_FROZEN_DAYS_AGO } from "./frozen-day-fixtures";
import {
	DAY_CLOSED_DUE_TODAY_IDS,
	type FixtureScenario,
	HABIT_DETAIL_HISTORY_DAYS,
	MANAGE_ARCHIVE_ARCHIVED_AT,
} from "./habit-fixtures";

/** Consecutive prior days completed for the `streak-at-risk` scenario, matching the "24-day streak" copy in docs/mockups/streak-at-risk.png. */
const STREAK_AT_RISK_DAYS = 24;

/**
 * Static fake entries backing the web-only repository (`entry-repository.web.ts`).
 * Marks habit #2 ("Read before bed") and #3 ("Glass of water") — both daily,
 * so they're due regardless of which real-world weekday the visual check
 * runs on — already done today, so the Today screen's progress bar and
 * per-group counts render non-zero instead of a flat 0%.
 *
 * `day-closed` instead completes every one of `DAY_CLOSED_DUE_TODAY_IDS`, so
 * the Today screen's Day-closed state (HAB-05) renders; `empty`/`rest-day`
 * have no due-today habits to complete. `quantity-log` logs the quantity
 * fixture habit partway to its target, matching docs/mockups/quantity-log.png
 * exactly (6 of 8), so the sheet screenshot can be compared to it directly.
 *
 * Habit #2 ("Read before bed") is a quantity habit (target 20 pages) — its
 * entry carries `value: 20` (full target) rather than just presence, so it
 * still reads as complete under HAB-07's value-based completion rule and the
 * default Today screenshot keeps matching docs/mockups/today-populated.png.
 */
export function makeEntryFixtures(
	scenario: FixtureScenario = "default",
): Entry[] {
	const today = format(new Date(), "yyyy-MM-dd");

	if (scenario === "day-closed") {
		return DAY_CLOSED_DUE_TODAY_IDS.map((habitId, index) => ({
			id: index + 1,
			habitId,
			date: today,
			createdAt: new Date(),
		}));
	}

	if (
		scenario === "empty" ||
		scenario === "rest-day" ||
		scenario === "habit-detail-new"
	) {
		return [];
	}

	if (scenario === "habit-detail") return habitDetailEntries();

	if (scenario === "manage-archive") return manageArchiveEntries();

	if (scenario === "weekly-summary" || scenario === "perfect-week") {
		return weeklySummaryEntries(scenario);
	}

	if (scenario === "retro-log") {
		// The tapped day: Read done, Meditate and Mobility not — matching
		// docs/mockups/retro-log.png (Glass of water's own history covers it).
		const entries = habitDetailEntries();
		entries.push({
			id: entries.length + 1,
			habitId: 3,
			date: format(subDays(new Date(), RETRO_LOG_DAYS_AGO), "yyyy-MM-dd"),
			value: 20,
			createdAt: new Date(),
		});
		return entries;
	}

	if (scenario === "streak-at-risk") {
		// Day -1 (yesterday) is intentionally left uncompleted — that's the miss
		// the streak-at-risk sheet is showing. Days -2 through -25 are all
		// completed, giving a 24-day streak standing before that miss.
		return Array.from({ length: STREAK_AT_RISK_DAYS }, (_, index) => {
			const daysAgo = index + 2;
			return {
				id: index + 1,
				habitId: 1,
				date: format(subDays(new Date(), daysAgo), "yyyy-MM-dd"),
				createdAt: new Date(),
			};
		});
	}

	if (scenario === "quantity-log") {
		return [
			{ id: 1, habitId: 1, date: today, value: 6, createdAt: new Date() },
		];
	}

	return [
		{ id: 1, habitId: 2, date: today, value: 20, createdAt: new Date() },
		{ id: 2, habitId: 3, date: today, createdAt: new Date() },
	];
}

/** The past day the `retro-log` visual check taps — inside the 24-day run, where Glass of water is logged at exactly its target (8). */
export const RETRO_LOG_DAYS_AGO = 3;

/**
 * Notes backing the web-only repository (HAB-10): the two Recent entries
 * subtitles docs/mockups/habit-detail.png shows, and — for `retro-log` — the
 * tapped day's note from docs/mockups/retro-log.png.
 */
export function makeEntryNoteFixtures(
	scenario: FixtureScenario = "default",
): EntryNote[] {
	if (scenario !== "habit-detail" && scenario !== "retro-log") return [];
	const daysAgo = (days: number) =>
		format(subDays(new Date(), days), "yyyy-MM-dd");
	const notes: EntryNote[] = [
		{
			habitId: 1,
			date: daysAgo(0),
			note: "Two before the run, rest at the desk.",
		},
		{
			habitId: 1,
			date: daysAgo(1),
			note: "Kept the bottle on the table — easy day.",
		},
	];
	if (scenario === "retro-log") {
		notes.push({
			habitId: 1,
			date: daysAgo(RETRO_LOG_DAYS_AGO),
			note: "Travel day — logged from the hotel.",
		});
	}
	return notes;
}

/** The `habit-detail` scenario's current streak — docs/mockups/habit-detail.png's "24". */
const HABIT_DETAIL_CURRENT_STREAK = 24;
/** Its longest run (41, as in the mockup), ending this many days ago. */
const HABIT_DETAIL_LONGEST = { days: 41, endedDaysAgo: 100 };

/**
 * ~5 months of "Glass of water" (target 8) history for Habit Detail: today
 * partway (6 / 8, as the mockup's first entry), an unbroken 24-day run behind
 * it, a 41-day run back in early summer, and a deterministic mix of full,
 * partial, and missed days in between — so every heatmap shade shows. The
 * frozen days (`frozen-day-fixtures.ts`) are left without an entry.
 */
function habitDetailEntries(): Entry[] {
	const frozen = new Set<number>(HABIT_DETAIL_FROZEN_DAYS_AGO);
	const longestEnd = HABIT_DETAIL_LONGEST.endedDaysAgo;
	const longestStart = longestEnd + HABIT_DETAIL_LONGEST.days - 1;

	function valueFor(daysAgo: number): number | null {
		if (daysAgo === 0) return 6;
		if (daysAgo <= HABIT_DETAIL_CURRENT_STREAK) return 8 + (daysAgo % 3);
		// The misses that bound each run, so neither grows past its target length.
		if (daysAgo === HABIT_DETAIL_CURRENT_STREAK + 1) return null;
		if (daysAgo === longestEnd - 1 || daysAgo === longestStart + 1) return null;
		if (daysAgo >= longestEnd && daysAgo <= longestStart) return 8;
		if (frozen.has(daysAgo)) return null;
		// Deterministic scatter: mostly full, some partial, a few misses.
		const bucket = (daysAgo * 7) % 25;
		if (bucket < 21) return 8 + (daysAgo % 2);
		if (bucket < 23) return 5;
		if (bucket < 24) return 3;
		return null;
	}

	const entries: Entry[] = [];
	for (let daysAgo = 0; daysAgo < HABIT_DETAIL_HISTORY_DAYS; daysAgo++) {
		const value = valueFor(daysAgo);
		if (value === null) continue;
		entries.push({
			id: entries.length + 1,
			habitId: 1,
			date: format(subDays(new Date(), daysAgo), "yyyy-MM-dd"),
			value,
			createdAt: subDays(new Date(), daysAgo),
		});
	}
	return entries;
}

/**
 * Mon→Sun (index 0–6) days each `weekly-summary` habit was done this week,
 * matching docs/mockups/weekly-summary.png's bars (Mobility 2/7, Easy run
 * 4/7, Read 5/7, No phone 5/7, Meditate 6/7, Water 7/7) with Tuesday the
 * best day at 6 of 6. Every habit is logged on Sunday, so with the visual
 * check's clock pinned to Sunday evening each bar reads out of 7. (The
 * mockup's "34 of 42" tile doesn't match its own bars, which sum to 29.)
 */
const WEEKLY_SUMMARY_DONE: Record<number, number[]> = {
	1: [0, 1, 2, 3, 4, 5, 6],
	2: [0, 1, 2, 3, 4, 6],
	3: [0, 1, 3, 4, 6],
	4: [0, 1, 4, 6],
	5: [1, 6],
	6: [0, 1, 4, 5, 6],
};

/** docs/mockups/perfect-week.png — every scheduled day done (Read Mon–Fri, Easy run 3×). */
const PERFECT_WEEK_DONE: Record<number, number[]> = {
	1: [0, 1, 2, 3, 4, 5, 6],
	2: [0, 1, 2, 3, 4, 5, 6],
	3: [0, 1, 2, 3, 4],
	4: [0, 2, 4],
	5: [0, 1, 2, 3, 4, 5, 6],
	6: [0, 1, 2, 3, 4, 5, 6],
};

function weeklySummaryEntries(
	scenario: "weekly-summary" | "perfect-week",
): Entry[] {
	const weekStart = startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON });
	const done =
		scenario === "perfect-week" ? PERFECT_WEEK_DONE : WEEKLY_SUMMARY_DONE;
	return Object.entries(done).flatMap(([habitId, days]) =>
		days.map((day) => ({
			id: Number(habitId) * 10 + day,
			habitId: Number(habitId),
			date: format(addDays(weekStart, day), "yyyy-MM-dd"),
			createdAt: addDays(weekStart, day),
		})),
	);
}

/**
 * docs/mockups/manage-archive.png's "41 logs kept" (Cold shower, #6) and
 * "96 logs kept" (No phone in bed, #7) — consecutive days up to each one's
 * archive date.
 */
function manageArchiveEntries(): Entry[] {
	const runs = [
		{ habitId: 6, count: 41, until: MANAGE_ARCHIVE_ARCHIVED_AT.coldShower },
		{ habitId: 7, count: 96, until: MANAGE_ARCHIVE_ARCHIVED_AT.noPhoneInBed },
	];
	return runs.flatMap(({ habitId, count, until }) =>
		Array.from({ length: count }, (_, index) => ({
			id: habitId * 1000 + index,
			habitId,
			date: format(subDays(until, index), "yyyy-MM-dd"),
			createdAt: until,
		})),
	);
}
