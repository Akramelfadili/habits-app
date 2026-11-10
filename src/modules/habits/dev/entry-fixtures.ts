import { addDays, format, startOfWeek, subDays, subWeeks } from "date-fns";
import { WEEK_STARTS_ON } from "../constants";
import type { Entry, EntryNote } from "../types";
import { HABIT_DETAIL_FROZEN_DAYS_AGO } from "./frozen-day-fixtures";
import {
	type FixtureScenario,
	HABIT_DETAIL_ARCHIVED_DAYS_AGO,
	HABIT_DETAIL_HISTORY_DAYS,
	MANAGE_ARCHIVE_ARCHIVED_AT,
} from "./habit-fixtures";
import { HABITS_V3_SCENARIOS, habitsV3Entries } from "./habits-v3-fixtures";
import { monthlyEntries } from "./monthly-fixtures";
import {
	PROGRESS_V3_SCENARIOS,
	progressV3Entries,
} from "./progress-v3-fixtures";
import { TODAY_V3_SCENARIOS, todayV3Entries } from "./today-v3-fixtures";
import { yearlyEntries } from "./yearly-fixtures";

const STREAK_AT_RISK_DAYS = 24;

// Habits #2 and #3 are daily, so they are due whichever weekday the check runs on. #2 is a
// quantity habit, so its entry carries `value: 20` (the full target) to read as complete.
export function makeEntryFixtures(
	scenario: FixtureScenario = "default",
): Entry[] {
	const today = format(new Date(), "yyyy-MM-dd");

	for (const name of TODAY_V3_SCENARIOS) {
		if (scenario === name) return todayV3Entries(name);
	}
	for (const name of PROGRESS_V3_SCENARIOS) {
		if (scenario === name) return progressV3Entries(name);
	}
	for (const name of HABITS_V3_SCENARIOS) {
		if (scenario === name) return habitsV3Entries(name);
	}

	if (
		scenario === "empty" ||
		scenario === "first-run" ||
		scenario === "rest-day" ||
		scenario === "habit-detail-new"
	) {
		return [];
	}

	if (scenario === "rest-day-picker" || scenario === "rest-day-ineligible") {
		return [];
	}

	if (scenario === "rest-day-logged") {
		const loggedAt = new Date();
		loggedAt.setHours(10, 42, 0, 0);
		return [{ id: 1, habitId: 3, date: today, createdAt: loggedAt }];
	}

	if (scenario === "monthly-summary" || scenario === "monthly-too-early") {
		return monthlyEntries(scenario === "monthly-too-early");
	}

	if (scenario === "yearly-summary") return yearlyEntries();

	if (scenario === "habit-detail" || scenario === "habit-detail-bonus") {
		return habitDetailEntries();
	}

	if (scenario === "habit-detail-archived") {
		const archivedOn = format(
			subDays(new Date(), HABIT_DETAIL_ARCHIVED_DAYS_AGO),
			"yyyy-MM-dd",
		);
		return habitDetailEntries()
			.filter((entry) => entry.date < archivedOn)
			.map(({ value: _value, ...entry }) => entry);
	}

	if (scenario === "manage-archive" || scenario === "manage-all-archived") {
		return manageArchiveEntries();
	}

	if (
		scenario === "weekly-summary" ||
		scenario === "weekly-summary-last-week" ||
		scenario === "perfect-week"
	) {
		return weeklySummaryEntries(scenario);
	}

	if (scenario === "retro-log") {
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

	if (
		scenario === "streak-at-risk" ||
		scenario === "streak-at-risk-no-freezes"
	) {
		// Yesterday is left uncompleted on purpose: that's the miss the at-risk sheet shows.
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

	if (scenario === "no-freezes") {
		const dayOf = (daysAgo: number) => ({
			habitId: 1,
			date: format(subDays(new Date(), daysAgo), "yyyy-MM-dd"),
			value: 10,
			createdAt: new Date(),
		});
		return [0, ...Array.from({ length: STREAK_AT_RISK_DAYS }, (_, i) => i + 2)]
			.map(dayOf)
			.map((entry, index) => ({ ...entry, id: index + 1 }));
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

const RETRO_LOG_DAYS_AGO = 3;

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

const HABIT_DETAIL_CURRENT_STREAK = 24;
const HABIT_DETAIL_LONGEST = { days: 41, endedDaysAgo: 100 };

// A deterministic mix of full, partial and missed days so every heatmap shade shows. The
// frozen days are left without an entry.
function habitDetailEntries(): Entry[] {
	const frozen = new Set<number>(HABIT_DETAIL_FROZEN_DAYS_AGO);
	const longestEnd = HABIT_DETAIL_LONGEST.endedDaysAgo;
	const longestStart = longestEnd + HABIT_DETAIL_LONGEST.days - 1;

	function valueFor(daysAgo: number): number | null {
		if (daysAgo === 0) return 6;
		if (daysAgo <= HABIT_DETAIL_CURRENT_STREAK) return 8 + (daysAgo % 3);
		if (daysAgo === HABIT_DETAIL_CURRENT_STREAK + 1) return null;
		if (daysAgo === longestEnd - 1 || daysAgo === longestStart + 1) return null;
		if (daysAgo >= longestEnd && daysAgo <= longestStart) return 8;
		if (frozen.has(daysAgo)) return null;
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

// Every habit is logged on Sunday, so with the clock pinned to Sunday evening each bar reads
// out of 7.
const WEEKLY_SUMMARY_DONE: Record<number, number[]> = {
	1: [0, 1, 2, 3, 4, 5, 6],
	2: [0, 1, 2, 3, 4, 6],
	3: [0, 1, 3, 4, 6],
	4: [0, 1, 4, 6],
	5: [1, 6],
	6: [0, 1, 4, 5, 6],
};

const PERFECT_WEEK_DONE: Record<number, number[]> = {
	1: [0, 1, 2, 3, 4, 5, 6],
	2: [0, 1, 2, 3, 4, 5, 6],
	3: [0, 1, 2, 3, 4],
	4: [0, 2, 4],
	5: [0, 1, 2, 3, 4, 5, 6],
	6: [0, 1, 2, 3, 4, 5, 6],
};

function weeklySummaryEntries(
	scenario: "weekly-summary" | "weekly-summary-last-week" | "perfect-week",
): Entry[] {
	// One week back: the summary opens on last week on a Monday.
	const thisWeek = startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON });
	const weekStart =
		scenario === "weekly-summary-last-week" ? subWeeks(thisWeek, 1) : thisWeek;
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
