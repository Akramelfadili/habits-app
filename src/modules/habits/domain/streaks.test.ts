import { startOfDay, subDays } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, FrozenDay } from "../types";

import {
	calculateCurrentStreak,
	freezesRemainingInMonth,
	freezesUsedInMonth,
	getStreakAtRisk,
	isEntryComplete,
} from "./streaks";

const HABIT_CREATED = new Date("2026-01-01T00:00:00Z");
const dailyHabit = makeHabit({
	id: 1,
	frequency: { type: "daily" },
	createdAt: HABIT_CREATED,
});
const breakHabit = makeHabit({
	id: 2,
	direction: "break",
	frequency: { type: "daily" },
	createdAt: HABIT_CREATED,
});
const quantityHabit = makeHabit({
	id: 3,
	targetType: "quantity",
	targetAmount: 10,
	targetUnit: "reps",
	frequency: { type: "daily" },
	createdAt: HABIT_CREATED,
});

function entry(habitId: number, date: string, value?: number): Entry {
	return { id: 0, habitId, date, value, createdAt: new Date(date) };
}

describe("isEntryComplete", () => {
	it("treats presence alone as complete for a simple-check habit", () => {
		expect(isEntryComplete(dailyHabit, entry(1, "2026-09-01"))).toBe(true);
	});

	it("requires the value to reach target for a quantity habit", () => {
		expect(isEntryComplete(quantityHabit, entry(3, "2026-09-01", 5))).toBe(
			false,
		);
		expect(isEntryComplete(quantityHabit, entry(3, "2026-09-01", 10))).toBe(
			true,
		);
	});

	it("is direction-agnostic — a Break habit's entry means resisted, same signal", () => {
		expect(isEntryComplete(breakHabit, entry(2, "2026-09-01"))).toBe(true);
	});
});

describe("calculateCurrentStreak", () => {
	it("counts consecutive completed due days walking back from asOf", () => {
		const entries = [
			entry(1, "2026-09-12"),
			entry(1, "2026-09-13"),
			entry(1, "2026-09-14"),
		];
		const streak = calculateCurrentStreak(
			dailyHabit,
			entries,
			new Set(),
			new Date("2026-09-14"),
		);
		expect(streak).toBe(3);
	});

	it("stops at the first due-but-missed day", () => {
		const entries = [entry(1, "2026-09-14"), entry(1, "2026-09-12")]; // 09-13 missing
		const streak = calculateCurrentStreak(
			dailyHabit,
			entries,
			new Set(),
			new Date("2026-09-14"),
		);
		expect(streak).toBe(1);
	});

	it("counts a frozen day as if it were completed", () => {
		const entries = [entry(1, "2026-09-14"), entry(1, "2026-09-12")]; // 09-13 missing, but frozen
		const streak = calculateCurrentStreak(
			dailyHabit,
			entries,
			new Set(["2026-09-13"]),
			new Date("2026-09-14"),
		);
		expect(streak).toBe(3);
	});

	it("skips non-due days without breaking the streak", () => {
		const weekdaysHabit = makeHabit({
			id: 4,
			frequency: { type: "weekdays", days: [1, 2, 3, 4, 5] }, // Mon-Fri
			createdAt: HABIT_CREATED,
		});
		// Fri 09-11, Mon 09-14 completed; Sat/Sun between aren't due, so they don't break it.
		const entries = [entry(4, "2026-09-11"), entry(4, "2026-09-14")];
		const streak = calculateCurrentStreak(
			weekdaysHabit,
			entries,
			new Set(),
			new Date("2026-09-14"),
		);
		expect(streak).toBe(2);
	});

	it("doesn't break a per-week streak on days the week never owed", () => {
		const threePerWeek = makeHabit({
			id: 6,
			frequency: { type: "per-week", timesPerWeek: 3 },
			createdAt: HABIT_CREATED,
		});
		// Mon/Wed/Fri of two consecutive weeks (09-07 and 09-14 are Mondays) —
		// the Tue/Thu gaps were never owed once each week's target was met.
		const entries = [
			"2026-09-07",
			"2026-09-09",
			"2026-09-11",
			"2026-09-14",
			"2026-09-16",
			"2026-09-18",
		].map((date) => entry(6, date));
		const streak = calculateCurrentStreak(
			threePerWeek,
			entries,
			new Set(),
			new Date("2026-09-20T12:00:00"),
		);
		expect(streak).toBe(6);
	});

	it("never walks back before the habit's own createdAt", () => {
		const youngHabit = makeHabit({
			id: 5,
			frequency: { type: "daily" },
			createdAt: new Date("2026-09-13T00:00:00Z"),
		});
		const entries = [entry(5, "2026-09-13"), entry(5, "2026-09-14")];
		const streak = calculateCurrentStreak(
			youngHabit,
			entries,
			new Set(),
			new Date("2026-09-14"),
		);
		expect(streak).toBe(2);
	});

	it("recalculates forward from a retroactively-edited day, not off a stored counter", () => {
		// Same entries as the "stops at the first missed day" case, plus 09-13
		// added retroactively (HAB-10) — recomputing must extend the streak,
		// since nothing is ever incremented and stored.
		const entries = [
			entry(1, "2026-09-12"),
			entry(1, "2026-09-13"),
			entry(1, "2026-09-14"),
		];
		const streak = calculateCurrentStreak(
			dailyHabit,
			entries,
			new Set(),
			new Date("2026-09-14"),
		);
		expect(streak).toBe(3);
	});
});

describe("getStreakAtRisk", () => {
	const today = new Date("2026-09-16T12:00:00Z"); // Wednesday
	const yesterday = "2026-09-15";

	it("flags a habit due yesterday, not completed, with a streak at stake", () => {
		const entries = [
			entry(1, "2026-09-13"),
			entry(1, "2026-09-14"),
			// 09-15 (yesterday) missing.
		];
		const result = getStreakAtRisk(dailyHabit, entries, new Set(), today);
		expect(result).toEqual({
			// Local-midnight of "yesterday," same as the implementation computes
			// it — not a hardcoded UTC string, which would drift with the runner's timezone.
			missedDate: subDays(startOfDay(today), 1),
			currentStreak: 2,
		});
	});

	it("returns null when yesterday was completed", () => {
		const entries = [entry(1, yesterday)];
		const result = getStreakAtRisk(dailyHabit, entries, new Set(), today);
		expect(result).toBeNull();
	});

	it("does not depend on the pool: with none left the habit is still at risk (SR3)", () => {
		// getStreakAtRisk no longer takes the pool, so an empty one cannot hide the state.
		const entries = [entry(1, "2026-09-14")];
		expect(
			getStreakAtRisk(dailyHabit, entries, new Set(), today),
		).not.toBeNull();
	});

	it("returns null when yesterday is already frozen", () => {
		const entries = [entry(1, "2026-09-14")];
		const result = getStreakAtRisk(
			dailyHabit,
			entries,
			new Set([yesterday]),
			today,
		);
		expect(result).toBeNull();
	});

	it("returns null when there's no streak standing before the miss", () => {
		const result = getStreakAtRisk(dailyHabit, [], new Set(), today);
		expect(result).toBeNull();
	});

	it("returns null when yesterday wasn't due (rest day / off-schedule)", () => {
		const wednesdayOnly = makeHabit({
			id: 6,
			frequency: { type: "weekdays", days: [3] }, // Wednesday only — yesterday was Tuesday.
			createdAt: HABIT_CREATED,
		});
		const entries = [entry(6, "2026-09-09")];
		const result = getStreakAtRisk(wednesdayOnly, entries, new Set(), today);
		expect(result).toBeNull();
	});
});

describe("getStreakAtRisk — × per week habits are never at risk by day (HAB-33)", () => {
	const threePerWeek = makeHabit({
		id: 8,
		frequency: { type: "per-week", timesPerWeek: 3 },
		createdAt: HABIT_CREATED,
	});
	const FRIDAY = new Date(2026, 9, 23, 12);
	const MONDAY = new Date(2026, 9, 19, 12);

	it("is not at risk with 1 of 3 logged, viewed on Friday", () => {
		const entries = [entry(8, "2026-10-19")];
		expect(
			getStreakAtRisk(threePerWeek, entries, new Set(), FRIDAY),
		).toBeNull();
		// The streak itself is unchanged by the gate.
		expect(
			calculateCurrentStreak(threePerWeek, entries, new Set(), FRIDAY),
		).toBe(1);
	});

	it("is not at risk with 1 of 3 logged last week, viewed on Monday", () => {
		const entries = [entry(8, "2026-10-12")];
		expect(
			getStreakAtRisk(threePerWeek, entries, new Set(), MONDAY),
		).toBeNull();
	});

	it("is not at risk after a met week either", () => {
		const entries = ["2026-10-12", "2026-10-14", "2026-10-16"].map((date) =>
			entry(8, date),
		);
		expect(
			getStreakAtRisk(threePerWeek, entries, new Set(), MONDAY),
		).toBeNull();
	});

	it("leaves a specific-day habit at risk exactly as before", () => {
		const mondayWednesday = makeHabit({
			id: 9,
			frequency: { type: "weekdays", days: [1, 3] },
			createdAt: HABIT_CREATED,
		});
		// Done Wed 14 Oct; missed Mon 19 Oct, viewed Tue 20 Oct.
		const entries = [entry(9, "2026-10-12"), entry(9, "2026-10-14")];
		expect(
			getStreakAtRisk(
				mondayWednesday,
				entries,
				new Set(),
				new Date(2026, 9, 20, 12),
			),
		).toEqual({ missedDate: new Date(2026, 9, 19), currentStreak: 2 });
	});
});

describe("after a restore (HAB-20)", () => {
	// Logged 1–10 Sep, archived 11 Sep, restored 21 Sep (pause 11–20 Sep).
	const restored = makeHabit({
		id: 1,
		frequency: { type: "daily" },
		createdAt: HABIT_CREATED,
		pauses: [{ from: "2026-09-11", to: "2026-09-20" }],
	});
	const before = Array.from({ length: 10 }, (_, index) =>
		entry(1, `2026-09-${String(index + 1).padStart(2, "0")}`),
	);
	const noFreezes = new Set<string>();

	it("calculateCurrentStreak counts from the restore day, never across the gap", () => {
		const asOf = new Date(2026, 8, 22);
		expect(calculateCurrentStreak(restored, before, noFreezes, asOf)).toBe(0);
		expect(
			calculateCurrentStreak(
				restored,
				[...before, entry(1, "2026-09-21"), entry(1, "2026-09-22")],
				noFreezes,
				asOf,
			),
		).toBe(2);
	});

	// Today's at-risk prompt is the one live caller besides Detail and Export:
	// a restored habit has no streak at stake, so it must stay silent.
	it("getStreakAtRisk raises no prompt for a restored habit with no new streak", () => {
		expect(
			getStreakAtRisk(restored, before, noFreezes, new Date(2026, 8, 22)),
		).toBeNull();
	});

	it("getStreakAtRisk is silent the morning after the restore too — yesterday was paused", () => {
		expect(
			getStreakAtRisk(restored, before, noFreezes, new Date(2026, 8, 21)),
		).toBeNull();
	});

	it("getStreakAtRisk works normally once a new streak exists", () => {
		const entries = [...before, entry(1, "2026-09-21")];
		// Yesterday (22nd) missed after a one-day new streak: a freeze can save it.
		expect(
			getStreakAtRisk(restored, entries, noFreezes, new Date(2026, 8, 23)),
		).toMatchObject({ currentStreak: 1 });
	});
});

describe("freezesRemainingInMonth", () => {
	it("returns the full pool when nothing's been used", () => {
		expect(freezesRemainingInMonth([], new Date("2026-09-16"))).toBe(2);
	});

	it("subtracts freezes used within the given month, across every habit", () => {
		const frozenDays: FrozenDay[] = [
			{ id: 1, habitId: 1, date: "2026-09-05", createdAt: new Date() },
			{ id: 2, habitId: 2, date: "2026-09-20", createdAt: new Date() },
		];
		expect(freezesRemainingInMonth(frozenDays, new Date("2026-09-16"))).toBe(0);
	});

	it("ignores freezes used in a different month", () => {
		const frozenDays: FrozenDay[] = [
			{ id: 1, habitId: 1, date: "2026-08-31", createdAt: new Date() },
		];
		expect(freezesRemainingInMonth(frozenDays, new Date("2026-09-16"))).toBe(2);
	});
});

describe("the freeze pool by calendar month (D13)", () => {
	const frozen = (
		id: number,
		date: string,
		createdAt = new Date(),
	): FrozenDay => ({
		id,
		habitId: id,
		date,
		createdAt,
	});

	it("counts used freezes by missed date, from the 1st to the last day of the month", () => {
		const days = [
			frozen(1, "2026-09-01"),
			frozen(2, "2026-09-30"),
			frozen(3, "2026-08-31"),
			frozen(4, "2026-10-01"),
		];
		expect(freezesUsedInMonth(days, new Date("2026-09-16"))).toBe(2);
		expect(freezesUsedInMonth(days, new Date("2026-10-16"))).toBe(1);
	});

	it("counts a freeze against the month of the day it covers, not the day it was used", () => {
		// Used on 1 October for Wednesday 30 September: September's pool pays for it.
		const days = [frozen(1, "2026-09-30", new Date("2026-10-01T08:00:00"))];
		expect(freezesUsedInMonth(days, new Date("2026-09-16"))).toBe(1);
		expect(freezesRemainingInMonth(days, new Date("2026-10-02"))).toBe(2);
	});

	it("resets on the 1st with no rollover, and never goes below zero", () => {
		const days = [frozen(1, "2026-09-10"), frozen(2, "2026-09-11")];
		expect(freezesRemainingInMonth(days, new Date("2026-09-30"))).toBe(0);
		expect(freezesRemainingInMonth(days, new Date("2026-10-01"))).toBe(2);
		const over = [...days, frozen(3, "2026-09-12")];
		expect(freezesRemainingInMonth(over, new Date("2026-09-30"))).toBe(0);
	});

	it("is shared by every habit: two habits frozen the same day use two", () => {
		const days = [
			{ ...frozen(1, "2026-09-10"), habitId: 7 },
			{ ...frozen(2, "2026-09-10"), habitId: 8 },
		];
		expect(freezesUsedInMonth(days, new Date("2026-09-10"))).toBe(2);
	});
});
