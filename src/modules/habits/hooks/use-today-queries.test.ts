import { renderHook } from "@testing-library/react-native";
import { formatISO } from "date-fns";
import { categoryNamed, makeHabit } from "../test-support/habit-builder";

// Pinned to a Wednesday (matches docs/mockups/today-populated.png's "WEDNESDAY,
// 16 SEPTEMBER") so week-boundary math (per-week frequency) is deterministic —
// "today" is computed inside the hook via `new Date()`, so real time can't
// drive this test's assertions.
const TODAY = new Date("2026-09-16T12:00:00Z");
const TODAY_STRING = formatISO(TODAY, { representation: "date" });
const YESTERDAY_STRING = "2026-09-15"; // Tuesday — same ISO week as TODAY.

const dailyHabit = makeHabit({
	id: 1,
	name: "Glass of water",
	category: categoryNamed("Morning"),
	frequency: { type: "daily" },
});
const alsoDailyHabit = makeHabit({
	id: 2,
	name: "Read",
	category: categoryNamed("Evening"),
	frequency: { type: "daily" },
});
const perWeekHabit = makeHabit({
	id: 3,
	name: "Gym",
	category: categoryNamed("Other"),
	frequency: { type: "per-week", timesPerWeek: 1 },
});
const quantityHabit = makeHabit({
	id: 4,
	name: "Push-ups",
	category: categoryNamed("Other"),
	targetType: "quantity",
	targetAmount: 20,
	targetUnit: "reps",
	frequency: { type: "daily" },
});

type MockEntry = {
	habitId: number;
	date: string;
	createdAt: Date;
	value?: number;
};

type MockFrozenDay = {
	habitId: number;
	date: string;
};

let mockHabits = [dailyHabit, alsoDailyHabit, perWeekHabit];
let mockEntries: MockEntry[] = [];
// Defaults to the full history `mockEntries` holds — most tests only care
// about "today," so the week-bounded and unbounded reads can share one list;
// tests that need streak history further back set this separately.
let mockAllEntries: MockEntry[] | undefined;
let mockFrozenDays: MockFrozenDay[] = [];
let mockEntriesRangeCalls: [Date, Date][] = [];

jest.mock("../repositories/habit-repository", () => ({
	useActiveHabits: () => ({ habits: mockHabits, loaded: true }),
}));
jest.mock("../repositories/entry-repository", () => ({
	useEntriesInRange: (...args: unknown[]) => {
		mockEntriesRangeCalls.push(args as [Date, Date]);
		return mockEntries;
	},
	useAllEntries: () => mockAllEntries ?? mockEntries,
}));
jest.mock("../repositories/category-repository", () => ({
	// Not loaded: Today's groups fall back to first appearance.
	useCategories: () => [],
}));
jest.mock("../repositories/frozen-day-repository", () => ({
	useFrozenDays: () => mockFrozenDays,
}));
const mockReminders: Reminder[] = [];
jest.mock("../repositories/reminder-repository", () => ({
	useAllReminders: () => mockReminders,
}));

import type { Reminder } from "../types";
import { useTodayQueries } from "./use-today-queries";

describe("useTodayQueries", () => {
	beforeEach(() => {
		jest.useFakeTimers().setSystemTime(TODAY);
		mockHabits = [dailyHabit, alsoDailyHabit, perWeekHabit];
		mockEntries = [];
		mockAllEntries = undefined;
		mockFrozenDays = [];
		mockEntriesRangeCalls = [];
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("groups due-today habits by category, Other last", async () => {
		const { result } = await renderHook(() => useTodayQueries());

		expect(result.current.groups.map((group) => group.category.name)).toEqual([
			"Morning",
			"Evening",
			"Other",
		]);
	});

	it("reports today's total habit count regardless of what's due", async () => {
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.totalHabitCount).toBe(3);
	});

	it("marks a habit completed today from its entry", async () => {
		mockEntries = [{ habitId: 1, date: TODAY_STRING, createdAt: TODAY }];
		const { result } = await renderHook(() => useTodayQueries());

		expect(result.current.completedHabitIds.has(1)).toBe(true);
		expect(result.current.completedHabitIds.has(2)).toBe(false);
	});

	it("computes overall progress from due habits and today's completions", async () => {
		mockEntries = [{ habitId: 1, date: TODAY_STRING, createdAt: TODAY }];
		const { result } = await renderHook(() => useTodayQueries());

		expect(result.current.progress).toEqual({
			completed: 1,
			total: 3,
			fraction: 1 / 3,
		});
	});

	it("excludes a per-week habit already past its weekly target from due habits", async () => {
		mockEntries = [
			{
				habitId: 3,
				date: YESTERDAY_STRING,
				createdAt: new Date(YESTERDAY_STRING),
			},
		];

		const { result } = await renderHook(() => useTodayQueries());
		const dueIds = result.current.groups.flatMap((group) =>
			group.habits.map((habit) => habit.id),
		);
		expect(dueIds).not.toContain(3);
	});

	it("keeps a per-week habit due when its target hasn't been met yet", async () => {
		const { result } = await renderHook(() => useTodayQueries());
		const dueIds = result.current.groups.flatMap((group) =>
			group.habits.map((habit) => habit.id),
		);
		expect(dueIds).toContain(3);
	});

	it("is rest-day when habits exist but none are due today", async () => {
		mockHabits = [
			makeHabit({ id: 1, frequency: { type: "weekdays", days: [4] } }), // Thursday only — TODAY is Wednesday.
		];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.viewState).toBe("rest-day");
	});

	it("stays populated at 100% — there is no day-closed screen (PR-01 is Later)", async () => {
		mockEntries = [
			{ habitId: 1, date: TODAY_STRING, createdAt: TODAY },
			{ habitId: 2, date: TODAY_STRING, createdAt: TODAY },
			{ habitId: 3, date: TODAY_STRING, createdAt: TODAY },
		];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.viewState).toBe("populated");
		expect(result.current.progress.fraction).toBe(1);
	});

	it("ignores an off-schedule entry for a habit that isn't due today", async () => {
		mockHabits = [
			makeHabit({
				id: 1,
				name: "Glass of water",
				frequency: { type: "weekdays", days: [4] },
			}), // Thursday only — TODAY is Wednesday.
		];
		mockEntries = [{ habitId: 1, date: TODAY_STRING, createdAt: TODAY }];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.progress.completed).toBe(0);
	});

	it("counts each habit's completed days so far this week, today included", async () => {
		const habit = makeHabit({
			id: 5,
			name: "Run",
			frequency: { type: "per-week", timesPerWeek: 5 },
		});
		mockHabits = [habit];
		mockEntries = [
			{ habitId: 5, date: "2026-09-14", createdAt: TODAY },
			{ habitId: 5, date: "2026-09-15", createdAt: TODAY },
			{ habitId: 5, date: TODAY_STRING, createdAt: TODAY },
		];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.completedThisWeekByHabitId.get(5)).toBe(3);
	});

	it("doesn't count a below-target quantity day toward this week", async () => {
		mockHabits = [quantityHabit];
		mockEntries = [
			{ habitId: 4, date: TODAY_STRING, createdAt: TODAY, value: 5 },
		];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.completedThisWeekByHabitId.get(4)).toBeUndefined();
	});

	it("does not count a quantity habit's entry as complete when below target", async () => {
		mockHabits = [quantityHabit];
		mockEntries = [
			{ habitId: 4, date: TODAY_STRING, createdAt: TODAY, value: 5 },
		];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.completedHabitIds.has(4)).toBe(false);
	});

	it("counts a quantity habit's entry as complete once the value reaches target", async () => {
		mockHabits = [quantityHabit];
		mockEntries = [
			{ habitId: 4, date: TODAY_STRING, createdAt: TODAY, value: 20 },
		];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.completedHabitIds.has(4)).toBe(true);
	});

	it("exposes today's logged value for a quantity habit via quantityValuesByHabitId", async () => {
		mockHabits = [quantityHabit];
		mockEntries = [
			{ habitId: 4, date: TODAY_STRING, createdAt: TODAY, value: 5 },
		];
		const { result } = await renderHook(() => useTodayQueries());
		expect(result.current.quantityValuesByHabitId.get(4)).toBe(5);
	});

	it("only counts a fully-reached quantity day toward a per-week habit's weekly target", async () => {
		const perWeekQuantityHabit = makeHabit({
			id: 5,
			name: "Run",
			targetType: "quantity",
			targetAmount: 5,
			targetUnit: "km",
			frequency: { type: "per-week", timesPerWeek: 1 },
		});
		mockHabits = [perWeekQuantityHabit];
		mockEntries = [
			{
				habitId: 5,
				date: YESTERDAY_STRING,
				createdAt: new Date(YESTERDAY_STRING),
				value: 2,
			},
		];
		const { result } = await renderHook(() => useTodayQueries());
		const dueIds = result.current.groups.flatMap((group) =>
			group.habits.map((habit) => habit.id),
		);
		expect(dueIds).toContain(5);
	});

	describe("streak-at-risk (HAB-08)", () => {
		it("reports the full freeze pool when nothing's been used this month", async () => {
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.freezesRemainingThisMonth).toBe(2);
		});

		it("subtracts freezes used this month, across every habit", async () => {
			mockFrozenDays = [
				{ habitId: 1, date: "2026-09-10" },
				{ habitId: 2, date: "2026-09-11" },
			];
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.freezesRemainingThisMonth).toBe(0);
		});

		it("flags a due-today habit at risk when yesterday was due and missed", async () => {
			mockHabits = [dailyHabit];
			mockAllEntries = [
				{ habitId: 1, date: "2026-09-14", createdAt: new Date("2026-09-14") },
				// 2026-09-15 (yesterday) intentionally missing.
			];
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.atRiskByHabitId.has(1)).toBe(true);
			expect(result.current.atRiskByHabitId.get(1)?.currentStreak).toBe(1);
		});

		it("does not flag a habit that completed yesterday", async () => {
			mockHabits = [dailyHabit];
			mockAllEntries = [
				{ habitId: 1, date: YESTERDAY_STRING, createdAt: TODAY },
			];
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.atRiskByHabitId.has(1)).toBe(false);
		});

		it("still flags a habit when the freeze pool is exhausted, so Today can explain it (SR3)", async () => {
			mockHabits = [dailyHabit];
			mockAllEntries = [
				{ habitId: 1, date: "2026-09-14", createdAt: new Date("2026-09-14") },
			];
			mockFrozenDays = [
				{ habitId: 2, date: "2026-09-01" },
				{ habitId: 2, date: "2026-09-02" },
			];
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.atRiskByHabitId.has(1)).toBe(true);
			expect(result.current.freezesRemainingThisMonth).toBe(0);
			expect(result.current.freezesUsedThisMonth).toBe(2);
		});

		it("counts the sheet's pool in the missed day's month: on the 1st that is last month's", async () => {
			jest.setSystemTime(new Date(2026, 9, 1, 12)); // Thu 1 Oct; yesterday = Wed 30 Sep
			mockHabits = [dailyHabit];
			mockAllEntries = ["2026-09-28", "2026-09-29"].map((date) => ({
				habitId: 1,
				date,
				createdAt: new Date(date),
			}));
			// September's pool is spent; October's is untouched.
			mockFrozenDays = [
				{ habitId: 2, date: "2026-09-10" },
				{ habitId: 2, date: "2026-09-11" },
			];
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.freezesRemainingThisMonth).toBe(2);
			expect(result.current.atRiskByHabitId.get(1)?.freezesRemaining).toBe(0);
		});

		it("does not flag a habit whose missed yesterday is already frozen", async () => {
			mockHabits = [dailyHabit];
			mockAllEntries = [
				{ habitId: 1, date: "2026-09-14", createdAt: new Date("2026-09-14") },
			];
			mockFrozenDays = [{ habitId: 1, date: YESTERDAY_STRING }];
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.atRiskByHabitId.has(1)).toBe(false);
		});

		it("reports a covered yesterday with the streak that was kept — the run before it, not counting it (T7)", async () => {
			mockHabits = [dailyHabit];
			mockAllEntries = ["2026-09-12", "2026-09-13", "2026-09-14"].map(
				(date) => ({
					habitId: 1,
					date,
					createdAt: new Date(date),
				}),
			);
			mockFrozenDays = [{ habitId: 1, date: YESTERDAY_STRING }];
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.frozenYesterdayByHabitId.get(1)?.streak).toBe(3);
		});

		it("does not flag a habit with no streak standing before the miss — nothing to lose", async () => {
			mockHabits = [dailyHabit];
			mockAllEntries = []; // No history at all — yesterday was due and missed, but streak-before-miss is 0.
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.atRiskByHabitId.has(1)).toBe(false);
		});

		it("never flags a habit that wasn't due yesterday, even if due today", async () => {
			const wednesdayOnly = makeHabit({
				id: 6,
				name: "Yoga",
				frequency: { type: "weekdays", days: [3] }, // Wednesday (TODAY) only — Tuesday (yesterday) isn't scheduled.
			});
			mockHabits = [wednesdayOnly];
			mockAllEntries = [
				{
					habitId: 6,
					date: "2026-09-09", // last Wednesday — a real prior streak, just not "missed yesterday."
					createdAt: new Date("2026-09-09"),
				},
			];
			const { result } = await renderHook(() => useTodayQueries());
			expect(result.current.atRiskByHabitId.has(6)).toBe(false);
		});
	});

	describe("a selected past day (HAB-30)", () => {
		// TODAY is Wednesday 16 Sep; Monday 7 Sep is in the week before it.
		const PAST = "2026-09-07";

		it("keys the week window and the day's reads by the selected day, not today", async () => {
			mockEntries = [{ habitId: 1, date: PAST, createdAt: TODAY }];
			const { result } = await renderHook(() => useTodayQueries(PAST));

			const [start, end] = mockEntriesRangeCalls.at(-1) ?? [];
			expect(formatISO(start as Date, { representation: "date" })).toBe(
				"2026-09-07",
			);
			expect(formatISO(end as Date, { representation: "date" })).toBe(
				"2026-09-13",
			);
			expect(result.current.completedHabitIds.has(1)).toBe(true);
			expect(
				formatISO(result.current.selectedDay, { representation: "date" }),
			).toBe(PAST);
			// The real today is still reported — streak-at-risk is measured from it.
			expect(formatISO(result.current.today, { representation: "date" })).toBe(
				TODAY_STRING,
			);
		});

		it("re-reads when the selected day moves to another week", async () => {
			const { rerender } = await renderHook(
				(key: string | null) => useTodayQueries(key),
				{ initialProps: null as string | null },
			);
			await rerender(PAST);
			const starts = mockEntriesRangeCalls.map(([start]) =>
				formatISO(start, { representation: "date" }),
			);
			expect(starts).toContain("2026-09-14");
			expect(starts.at(-1)).toBe("2026-09-07");
		});

		it("reads that day's quantity value, not today's", async () => {
			mockHabits = [quantityHabit];
			mockEntries = [
				{ habitId: 4, date: PAST, createdAt: TODAY, value: 12 },
				{ habitId: 4, date: TODAY_STRING, createdAt: TODAY, value: 3 },
			];
			const { result } = await renderHook(() => useTodayQueries(PAST));
			expect(result.current.quantityValuesByHabitId.get(4)).toBe(12);
		});

		it("does not list a habit that did not exist yet, or one that was paused that day", async () => {
			mockHabits = [
				dailyHabit,
				makeHabit({ id: 8, name: "New", createdAt: new Date(2026, 8, 10) }),
				makeHabit({
					id: 9,
					name: "Paused",
					createdAt: new Date(2026, 0, 1),
					pauses: [{ from: "2026-09-05", to: "2026-09-09" }],
				}),
			];
			const { result } = await renderHook(() => useTodayQueries(PAST));
			const ids = result.current.groups.flatMap((group) =>
				group.habits.map((habit) => habit.id),
			);
			expect(ids).toEqual([1]);
		});

		it("does not list a day's not-due habits", async () => {
			mockHabits = [
				makeHabit({ id: 1, frequency: { type: "weekdays", days: [3] } }), // Wednesday only
			];
			const { result } = await renderHook(() => useTodayQueries(PAST)); // a Monday
			expect(result.current.viewState).toBe("rest-day");
		});

		it("never flags streak-at-risk — that belongs to the real today", async () => {
			mockHabits = [dailyHabit];
			mockAllEntries = ["2026-09-12", "2026-09-13", "2026-09-14"].map(
				(date) => ({
					habitId: 1,
					date,
					createdAt: TODAY,
				}),
			);
			// Today: yesterday (15th) was missed with a 3-day streak before it.
			const followed = await renderHook(() => useTodayQueries());
			expect(followed.result.current.atRiskByHabitId.size).toBe(1);

			const past = await renderHook(() => useTodayQueries("2026-09-15"));
			expect(past.result.current.atRiskByHabitId.size).toBe(0);
		});
	});
});
