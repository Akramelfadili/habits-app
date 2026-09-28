import { startOfDay, subDays } from "date-fns";
import { makeHabit } from "../test-support/habit-builder";
import type { Entry, FrozenDay } from "../types";

const mockGetFreezesUsedInMonth = jest.fn();
const mockFreezeHabitDay = jest.fn();
jest.mock("../repositories/frozen-day-repository", () => ({
	getFreezesUsedInMonth: (...args: unknown[]) =>
		mockGetFreezesUsedInMonth(...args),
	freezeHabitDay: (...args: unknown[]) => mockFreezeHabitDay(...args),
}));

import {
	applyFreeze,
	calculateCurrentStreak,
	freezesRemainingInMonth,
	getStreakAtRisk,
	isEntryComplete,
} from "./habit-service";

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
		const result = getStreakAtRisk(dailyHabit, entries, new Set(), 2, today);
		expect(result).toEqual({
			// Local-midnight of "yesterday," same as the implementation computes
			// it — not a hardcoded UTC string, which would drift with the runner's timezone.
			missedDate: subDays(startOfDay(today), 1),
			currentStreak: 2,
		});
	});

	it("returns null when yesterday was completed", () => {
		const entries = [entry(1, yesterday)];
		const result = getStreakAtRisk(dailyHabit, entries, new Set(), 2, today);
		expect(result).toBeNull();
	});

	it("returns null when the freeze pool is exhausted — nothing to offer", () => {
		const entries = [entry(1, "2026-09-14")];
		const result = getStreakAtRisk(dailyHabit, entries, new Set(), 0, today);
		expect(result).toBeNull();
	});

	it("returns null when yesterday is already frozen", () => {
		const entries = [entry(1, "2026-09-14")];
		const result = getStreakAtRisk(
			dailyHabit,
			entries,
			new Set([yesterday]),
			2,
			today,
		);
		expect(result).toBeNull();
	});

	it("returns null when there's no streak standing before the miss", () => {
		const result = getStreakAtRisk(dailyHabit, [], new Set(), 2, today);
		expect(result).toBeNull();
	});

	it("returns null when yesterday wasn't due (rest day / off-schedule)", () => {
		const wednesdayOnly = makeHabit({
			id: 6,
			frequency: { type: "weekdays", days: [3] }, // Wednesday only — yesterday was Tuesday.
			createdAt: HABIT_CREATED,
		});
		const entries = [entry(6, "2026-09-09")];
		const result = getStreakAtRisk(wednesdayOnly, entries, new Set(), 2, today);
		expect(result).toBeNull();
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

describe("applyFreeze", () => {
	beforeEach(() => {
		mockGetFreezesUsedInMonth.mockReset();
		mockFreezeHabitDay.mockReset();
	});

	it("writes the freeze when the pool has room", async () => {
		mockGetFreezesUsedInMonth.mockResolvedValue(1);
		await applyFreeze(1, new Date("2026-09-15"));
		expect(mockFreezeHabitDay).toHaveBeenCalledWith(1, new Date("2026-09-15"));
	});

	it("refuses to write once the shared pool is exhausted", async () => {
		mockGetFreezesUsedInMonth.mockResolvedValue(2);
		await expect(applyFreeze(1, new Date("2026-09-15"))).rejects.toThrow();
		expect(mockFreezeHabitDay).not.toHaveBeenCalled();
	});
});
